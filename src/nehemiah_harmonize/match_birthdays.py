from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import pandas as pd
from difflib import SequenceMatcher

from nehemiah_harmonize.normalize import normalize_name


@dataclass(frozen=True)
class MatchDecision:
    entry_id: str
    decision: str


def _last_token(name_norm: str) -> str:
    toks = [t for t in name_norm.split(" ") if t]
    return toks[-1] if toks else ""


def _score(bday_name: str, member_name_norm: str) -> int:
    b_norm = normalize_name(bday_name) or ""
    if not b_norm or not member_name_norm:
        return 0
    score = token_set_ratio(b_norm, member_name_norm)
    if _last_token(b_norm) and _last_token(b_norm) == _last_token(member_name_norm):
        score = min(100, score + 3)
    return score


def token_set_ratio(a: str, b: str) -> int:
    aset = {t for t in a.lower().split() if t}
    bset = {t for t in b.lower().split() if t}
    aa = " ".join(sorted(aset))
    bb = " ".join(sorted(bset))
    return int(round(100 * SequenceMatcher(None, aa, bb).ratio()))


def build_match_review(
    *,
    members_df: pd.DataFrame,
    birthdays_df: pd.DataFrame,
    top_candidates: int,
    auto_link_threshold: int,
    review_threshold: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Returns:
      - review_df: rows needing human decision, including top candidates
      - linked_df: birthdays_df with member_id filled for auto-linked entries
    birthdays_df must include: entry_id, name_raw, month, day
    members_df must include: member_id, name_normalized, dob_month, dob_day
    """
    linked = birthdays_df.copy()
    linked["member_id"] = ""
    review_rows: list[dict[str, str]] = []

    # Precompute member candidates by month/day keys.
    members_df = members_df.copy()
    members_df["dob_month"] = members_df["dob_month"].astype(str)
    members_df["dob_day"] = members_df["dob_day"].astype(str)

    for i in range(len(linked)):
        entry_id = str(linked.at[i, "entry_id"])
        name_raw = str(linked.at[i, "name_raw"])
        month = linked.at[i, "month"]
        day = linked.at[i, "day"]
        month_s = "" if pd.isna(month) else str(month).strip()
        day_s = "" if pd.isna(day) else str(day).strip()
        if not month_s:
            month_s = ""
        if not day_s:
            day_s = ""

        if month_s and day_s:
            cand = members_df[(members_df["dob_month"] == month_s) & (members_df["dob_day"] == day_s)]
        elif month_s:
            cand = members_df[members_df["dob_month"] == month_s]
        else:
            cand = members_df.iloc[0:0]

        scored: list[tuple[str, int]] = []
        for _, r in cand.iterrows():
            mid = str(r["member_id"])
            mname = str(r["name_normalized"])
            scored.append((mid, _score(name_raw, mname)))
        scored.sort(key=lambda x: x[1], reverse=True)

        best = scored[0] if scored else ("", 0)
        second = scored[1] if len(scored) > 1 else ("", 0)

        # Auto-link only if clearly above threshold and not tied.
        if best[1] >= auto_link_threshold and (best[1] - second[1] >= 3):
            linked.at[i, "member_id"] = best[0]
            continue

        # Review if we have any plausible candidates or missing month context.
        needs_review = False
        if month_s and (best[1] >= review_threshold):
            needs_review = True
        if not month_s:
            needs_review = True

        if needs_review:
            row: dict[str, str] = {
                "entry_id": entry_id,
                "birthdays_name": name_raw,
                "birthdays_month": month_s,
                "birthdays_day": day_s,
                "decision": "",
            }
            for k in range(top_candidates):
                mid, sc = scored[k] if k < len(scored) else ("", 0)
                row[f"cand_{k+1}_member_id"] = mid
                row[f"cand_{k+1}_score"] = str(sc)
            review_rows.append(row)
        # else: unlinked, no review row

    review_df = pd.DataFrame(review_rows)
    return review_df, linked


def apply_decisions(
    *, linked_birthdays_df: pd.DataFrame, decisions_df: pd.DataFrame, valid_member_ids: set[str] | None = None
) -> pd.DataFrame:
    """
    decisions_df expects: entry_id, decision
      - 'link:M000123'
      - 'unlinked'
    """
    out = linked_birthdays_df.copy()
    if decisions_df.empty:
        return out

    decisions_map = {str(r["entry_id"]): str(r.get("decision", "")).strip() for _, r in decisions_df.iterrows()}
    for i in range(len(out)):
        eid = str(out.at[i, "entry_id"])
        decision = decisions_map.get(eid, "")
        if not decision:
            continue
        if decision.startswith("link:"):
            mid = decision.split(":", 1)[1].strip()
            if valid_member_ids is not None and mid not in valid_member_ids:
                continue
            out.at[i, "member_id"] = mid
        elif decision == "unlinked":
            out.at[i, "member_id"] = ""
    return out
