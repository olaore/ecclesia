from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

import pandas as pd
from difflib import SequenceMatcher


class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra = self.find(a)
        rb = self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            self.parent[ra] = rb
        elif self.rank[ra] > self.rank[rb]:
            self.parent[rb] = ra
        else:
            self.parent[rb] = ra
            self.rank[ra] += 1

    def groups(self) -> dict[int, list[int]]:
        out: dict[int, list[int]] = {}
        for i in range(len(self.parent)):
            r = self.find(i)
            out.setdefault(r, []).append(i)
        return out


def _nonempty(s: str) -> bool:
    return bool(str(s).strip())


def _last_token(name_norm: str) -> str:
    toks = [t for t in name_norm.split(" ") if t]
    return toks[-1] if toks else ""


def _first_token(name_norm: str) -> str:
    toks = [t for t in name_norm.split(" ") if t]
    return toks[0] if toks else ""


def build_core_clusters(
    core_df: pd.DataFrame,
    *,
    core_fuzzy_threshold: int,
    max_block_size: int,
) -> tuple[dict[int, list[int]], pd.DataFrame, pd.DataFrame]:
    """
    Returns:
      - clusters mapping root_index -> list[row_index]
      - duplicates_df describing clusters (for audit)

    core_df must contain: phone_e164, email_normalized, name_normalized, dob_iso, dob_month, dob_day.
    """
    n = len(core_df)
    uf = UnionFind(n)

    # Exact keys: phone/email/name+dob
    shared_contact_rows: list[dict[str, str]] = []

    def union_by_key(col: str, *, kind: str) -> None:
        seen: dict[str, int] = {}
        for i, v in enumerate(core_df[col].astype(str).tolist()):
            vv = v.strip()
            if not vv:
                continue
            j = seen.get(vv)
            if j is None:
                seen[vv] = i
            else:
                name_i = str(core_df.at[i, "name_normalized"]).strip()
                name_j = str(core_df.at[j, "name_normalized"]).strip()
                score = token_sort_ratio(name_i, name_j) if (name_i and name_j) else 0
                # Guard against shared family contacts causing over-merge.
                if score >= 60:
                    uf.union(i, j)
                else:
                    shared_contact_rows.append(
                        {
                            "kind": kind,
                            "value": vv,
                            "_core_row_id_a": str(core_df.at[i, "_core_row_id"]),
                            "_core_row_id_b": str(core_df.at[j, "_core_row_id"]),
                            "name_a": str(core_df.at[i, "full_name"]),
                            "name_b": str(core_df.at[j, "full_name"]),
                            "name_similarity": str(score),
                        }
                    )

    union_by_key("phone_e164", kind="phone_e164")
    union_by_key("email_normalized", kind="email_normalized")

    # name+dob (full or month/day)
    key_seen: dict[str, int] = {}
    for i in range(n):
        name = str(core_df.at[i, "name_normalized"]).strip()
        if not name:
            continue
        dob_iso = str(core_df.at[i, "dob_iso"]).strip()
        dob_month = str(core_df.at[i, "dob_month"]).strip()
        dob_day = str(core_df.at[i, "dob_day"]).strip()
        dob_key = dob_iso or (f"{dob_month}-{dob_day}" if dob_month and dob_day else "")
        if not dob_key:
            continue
        key = f"{name}|{dob_key}"
        j = key_seen.get(key)
        if j is None:
            key_seen[key] = i
        else:
            uf.union(i, j)

    # Fuzzy within blocks.
    blocks: dict[str, list[int]] = {}
    for i in range(n):
        name = str(core_df.at[i, "name_normalized"]).strip()
        last = _last_token(name)
        last_initial = (last[0] if last else "x")
        dob_month = str(core_df.at[i, "dob_month"]).strip() or "xx"
        block = f"{last_initial}:{dob_month}"
        blocks.setdefault(block, []).append(i)

    skipped_blocks: list[tuple[str, int]] = []
    for block, idxs in blocks.items():
        if len(idxs) <= 1:
            continue
        if len(idxs) > max_block_size:
            skipped_blocks.append((block, len(idxs)))
            continue

        # Additional sub-block to reduce comparisons.
        subblocks: dict[str, list[int]] = {}
        for i in idxs:
            first = _first_token(str(core_df.at[i, "name_normalized"]).strip())
            sub = f"{block}:{(first[0] if first else 'x')}"
            subblocks.setdefault(sub, []).append(i)

        for _, sidxs in subblocks.items():
            if len(sidxs) <= 1:
                continue
            for a_pos in range(len(sidxs)):
                a = sidxs[a_pos]
                name_a = str(core_df.at[a, "name_normalized"]).strip()
                if not name_a:
                    continue
                for b_pos in range(a_pos + 1, len(sidxs)):
                    b = sidxs[b_pos]
                    name_b = str(core_df.at[b, "name_normalized"]).strip()
                    if not name_b:
                        continue

                    # Disqualify if both have month/day and they disagree.
                    am = str(core_df.at[a, "dob_month"]).strip()
                    ad = str(core_df.at[a, "dob_day"]).strip()
                    bm = str(core_df.at[b, "dob_month"]).strip()
                    bd = str(core_df.at[b, "dob_day"]).strip()
                    if am and ad and bm and bd and (am != bm or ad != bd):
                        continue

                    score = token_sort_ratio(name_a, name_b)
                    if score >= core_fuzzy_threshold:
                        uf.union(a, b)

    groups = uf.groups()

    # Build duplicates audit.
    rows: list[dict[str, str]] = []
    for root, members in groups.items():
        if len(members) <= 1:
            continue
        for i in members:
            rows.append(
                {
                    "cluster_root_index": str(root),
                    "row_index": str(i),
                    "_core_row_id": str(core_df.at[i, "_core_row_id"]),
                    "full_name": str(core_df.at[i, "full_name"]),
                    "name_normalized": str(core_df.at[i, "name_normalized"]),
                    "phone_e164": str(core_df.at[i, "phone_e164"]),
                    "email_normalized": str(core_df.at[i, "email_normalized"]),
                    "dob_iso": str(core_df.at[i, "dob_iso"]),
                }
            )

    dup_df = pd.DataFrame(rows)
    if skipped_blocks:
        # Surface this in the duplicates audit so it's visible during runs.
        skipped_df = pd.DataFrame(
            [{"cluster_root_index": "SKIPPED_BLOCK", "row_index": "", "_core_row_id": "", "full_name": "", "name_normalized": k, "phone_e164": "", "email_normalized": "", "dob_iso": str(sz)} for k, sz in skipped_blocks]
        )
        dup_df = pd.concat([dup_df, skipped_df], ignore_index=True)

    shared_df = pd.DataFrame(shared_contact_rows)
    return groups, dup_df, shared_df


def token_sort_ratio(a: str, b: str) -> int:
    aa = " ".join(sorted([t for t in a.lower().split() if t]))
    bb = " ".join(sorted([t for t in b.lower().split() if t]))
    return int(round(100 * SequenceMatcher(None, aa, bb).ratio()))


@dataclass(frozen=True)
class MergeResult:
    merged: pd.DataFrame
    conflicts: pd.DataFrame


def _completeness_score(row: pd.Series, fields: Iterable[str]) -> int:
    score = 0
    for f in fields:
        if _nonempty(str(row.get(f, "")).strip()):
            score += 1
    return score


def merge_clusters(core_df: pd.DataFrame, clusters: dict[int, list[int]]) -> MergeResult:
    """
    Merge rows within each cluster.
    Keeps a full audit of conflicting non-empty values.
    """
    canonical_fields = [
        "timestamp",
        "full_name",
        "first_name",
        "last_name",
        "gender",
        "address",
        "marital_status",
        "occupation",
        "department_raw",
        "comments",
        "phone_raw",
        "phone_e164",
        "email_raw",
        "email_normalized",
        "dob_year",
        "dob_month",
        "dob_day",
        "dob_iso",
        "name_normalized",
    ]
    keep_fields = ["_core_row_id"] + canonical_fields

    merged_rows: list[dict[str, str]] = []
    conflicts: list[dict[str, str]] = []

    used = set()
    for _, idxs in clusters.items():
        if not idxs:
            continue
        idxs = sorted(idxs, key=lambda x: int(core_df.at[x, "_core_row_id"]))
        for i in idxs:
            used.add(i)

        cluster_df = core_df.iloc[idxs]
        # Choose survivor by completeness, tie-breaker by smallest _core_row_id.
        best_idx = None
        best_score = -1
        best_row_id = 10**18
        for i in idxs:
            row = core_df.iloc[i]
            score = _completeness_score(row, canonical_fields)
            row_id = int(str(row["_core_row_id"]))
            if score > best_score or (score == best_score and row_id < best_row_id):
                best_score = score
                best_row_id = row_id
                best_idx = i
        assert best_idx is not None

        survivor = {f: str(core_df.at[best_idx, f]) for f in keep_fields}
        survivor["_cluster_size"] = str(len(idxs))
        survivor["_cluster_row_ids"] = ",".join(str(core_df.at[i, "_core_row_id"]) for i in sorted(idxs, key=lambda x: int(core_df.at[x, "_core_row_id"])))

        # Field-wise fill: take first non-empty; if conflicts, keep survivor value and audit.
        for f in canonical_fields:
            values: list[str] = []
            for i in idxs:
                v = str(core_df.at[i, f]).strip()
                if v:
                    values.append(v)
            if not values:
                survivor[f] = ""
                continue
            # If survivor empty, fill from the earliest row in cluster.
            if not str(survivor.get(f, "")).strip():
                survivor[f] = values[0]
            # Conflicts: multiple distinct non-empty values.
            distinct = sorted(set(values))
            if len(distinct) > 1:
                conflicts.append(
                    {
                        "_cluster_row_ids": survivor["_cluster_row_ids"],
                        "field": f,
                        "chosen": str(survivor.get(f, "")).strip(),
                        "alternatives": "|".join(distinct),
                    }
                )

        merged_rows.append(survivor)

    merged_df = pd.DataFrame(merged_rows)
    conflicts_df = pd.DataFrame(conflicts)

    # Deterministic member_id assignment.
    sort_cols = ["name_normalized", "phone_e164", "email_normalized", "dob_year", "dob_month", "dob_day"]
    for c in sort_cols:
        if c not in merged_df.columns:
            merged_df[c] = ""
    merged_df = merged_df.sort_values(by=sort_cols, kind="mergesort").reset_index(drop=True)
    merged_df.insert(0, "member_id", [f"M{i:06d}" for i in range(1, len(merged_df) + 1)])

    return MergeResult(merged=merged_df, conflicts=conflicts_df)
