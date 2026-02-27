from __future__ import annotations

from pathlib import Path

import pandas as pd

from nehemiah_harmonize.birthdays_csv import load_birthdays_csv
from nehemiah_harmonize.config import load_config
from nehemiah_harmonize.core import build_core_canonical, load_core_csv, resolve_core_columns, write_csv
from nehemiah_harmonize.dedup import build_core_clusters, merge_clusters
from nehemiah_harmonize.match_birthdays import apply_decisions, build_match_review


def run_pipeline(
    *,
    core_csv_path: Path,
    birthdays_csv_path: Path | None,
    out_dir: Path,
    config_path: Path,
    decisions_csv_path: Path | None,
) -> None:
    config = load_config(config_path)

    raw_core = load_core_csv(core_csv_path)
    cols = resolve_core_columns(raw_core, config)
    core = build_core_canonical(raw_core, cols, config)

    clusters, dup_df, shared_df = build_core_clusters(
        core,
        core_fuzzy_threshold=config.core_fuzzy_threshold,
        max_block_size=config.max_block_size,
    )
    merge = merge_clusters(core, clusters)

    write_csv(out_dir / "core_duplicates.csv", dup_df)
    if not shared_df.empty:
        write_csv(out_dir / "shared_contact_suspects.csv", shared_df)
    write_csv(out_dir / "audit_conflicts.csv", merge.conflicts)
    write_csv(out_dir / "master_members.csv", merge.merged)

    # Sanity check: large reductions often indicate over-merge (e.g., shared family contacts).
    if len(core) > 0:
        ratio = len(merge.merged) / len(core)
        if ratio < 0.85:
            (out_dir / "dedup_warning.txt").write_text(
                f"Warning: dedup reduced rows to {ratio:.0%} of input ({len(merge.merged)}/{len(core)}).\n"
                "This can be caused by shared family phone/email values.\n"
                "Review out/shared_contact_suspects.csv and out/core_duplicates.csv.\n",
                encoding="utf-8",
            )

    # Birthdays: optional
    if birthdays_csv_path is None:
        return

    bload = load_birthdays_csv(birthdays_csv_path)
    bdf = bload.birthdays
    if not bload.duplicates.empty:
        write_csv(out_dir / "birthdays_duplicates.csv", bload.duplicates)

    members = merge.merged.copy()
    review_df, linked_df = build_match_review(
        members_df=members,
        birthdays_df=bdf,
        top_candidates=config.top_candidates,
        auto_link_threshold=config.auto_link_threshold,
        review_threshold=config.review_threshold,
    )

    if decisions_csv_path is not None and decisions_csv_path.exists():
        decisions = pd.read_csv(decisions_csv_path, dtype=str, keep_default_na=False)
        valid_member_ids = set(members["member_id"].astype(str).tolist())
        invalid_rows: list[dict[str, str]] = []
        if "entry_id" in decisions.columns and "decision" in decisions.columns:
            for _, r in decisions.iterrows():
                d = str(r.get("decision", "")).strip()
                if d.startswith("link:"):
                    mid = d.split(":", 1)[1].strip()
                    if mid and mid not in valid_member_ids:
                        invalid_rows.append({"entry_id": str(r.get("entry_id", "")).strip(), "decision": d})
        if invalid_rows:
            write_csv(out_dir / "invalid_decisions.csv", pd.DataFrame(invalid_rows))
        linked_df = apply_decisions(
            linked_birthdays_df=linked_df,
            decisions_df=decisions,
            valid_member_ids=valid_member_ids,
        )

    write_csv(out_dir / "birthdays_all.csv", linked_df)

    unlinked = linked_df[linked_df["member_id"].astype(str).str.strip() == ""].copy()
    write_csv(out_dir / "birthdays_unlinked.csv", unlinked)

    if not review_df.empty:
        write_csv(out_dir / "match_review.csv", review_df)

    # Normalized outputs for later DB import.
    sqlite_dir = out_dir / "sqlite_import"
    sqlite_dir.mkdir(parents=True, exist_ok=True)
    write_csv(sqlite_dir / "members.csv", members)
    write_csv(sqlite_dir / "birthdays.csv", linked_df)
