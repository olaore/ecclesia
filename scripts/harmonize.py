#!/usr/bin/env python3
"""
Nehemiah Data Harmonization — Single-pass merge of core members + birthday list.

Reads:
  data/core.csv       — Google Form export (source of truth)
  data/birthday.csv   — Legacy birthday list (name, birthday_mm_dd)

Writes:
  out/master_members.csv — One clean deduplicated member list
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

_HONORIFICS = {
    "mr", "mrs", "ms", "miss", "dr", "pastor", "pst", "bro", "br",
    "sis", "sister", "rev", "revd", "reverend", "chief",
}


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def normalize_name(raw: str | None) -> str:
    if not raw:
        return ""
    s = _clean(str(raw))
    s = re.sub(r"\brev[''']d\b", "revd", s, flags=re.IGNORECASE)
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    s = _clean(s).lower()
    tokens = [t for t in s.split() if t and t not in _HONORIFICS]
    return " ".join(tokens)


def normalize_phone(raw: str | None) -> str:
    """Return E.164 for Nigerian numbers, or empty string."""
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw).split(",")[0].strip())
    if not digits:
        return ""
    if digits.startswith("234") and len(digits) >= 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+234{digits[1:]}"
    return ""


def normalize_email(raw: str | None) -> str:
    if not raw:
        return ""
    e = _clean(str(raw)).lower()
    return e if "@" in e else ""


def parse_month_day(raw: str | None) -> tuple[str, str]:
    """Parse 'M/D' or 'MM/DD' into (month, day) strings. Returns ('','') on failure."""
    if not raw:
        return ("", "")
    s = _clean(str(raw))
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})$", s)
    if not m:
        return ("", "")
    month, day = int(m.group(1)), int(m.group(2))
    if 1 <= month <= 12 and 1 <= day <= 31:
        return (str(month), str(day))
    return ("", "")


def _normalize_header(h: str) -> str:
    s = re.sub(r"\s+", " ", h.strip()).lower()
    return s.replace(" ", "_")


def token_sort_ratio(a: str, b: str) -> int:
    aa = " ".join(sorted(a.lower().split()))
    bb = " ".join(sorted(b.lower().split()))
    return int(round(100 * SequenceMatcher(None, aa, bb).ratio()))


# ---------------------------------------------------------------------------
# Union-Find for dedup clustering
# ---------------------------------------------------------------------------

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
        ra, rb = self.find(a), self.find(b)
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
            out.setdefault(self.find(i), []).append(i)
        return out


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def load_csv(path: Path) -> list[dict[str, str]]:
    import pandas as pd
    df = pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[],
                     on_bad_lines="warn", engine="python")
    df.columns = [_normalize_header(c) for c in df.columns]
    # Drop phantom unnamed columns from trailing commas.
    df = df[[c for c in df.columns if not c.startswith("unnamed")]]
    df = df.reset_index(drop=True)
    return df.to_dict("records")


def run(core_path: Path, bday_path: Path | None, out_dir: Path) -> None:
    # ── 1. Load & normalize core ──────────────────────────────────────────
    rows = load_csv(core_path)
    required = {"full_name", "phone", "email", "dob"}
    found = set(rows[0].keys()) if rows else set()
    missing = required - found
    if missing:
        print(f"ERROR: Core CSV missing columns: {sorted(missing)}", file=sys.stderr)
        print(f"  Found: {sorted(found)}", file=sys.stderr)
        print(f"  Rename headers so these are present: {sorted(required)}", file=sys.stderr)
        sys.exit(1)

    for r in rows:
        r["name_normalized"] = normalize_name(r.get("full_name"))
        r["phone_e164"] = normalize_phone(r.get("phone"))
        r["email_normalized"] = normalize_email(r.get("email"))
        m, d = parse_month_day(r.get("dob"))
        r["dob_month"] = m
        r["dob_day"] = d

    # ── 2. Dedup core ─────────────────────────────────────────────────────
    n = len(rows)
    uf = UnionFind(n)

    def union_by_key(key: str) -> None:
        seen: dict[str, int] = {}
        for i, r in enumerate(rows):
            v = r.get(key, "").strip()
            if not v:
                continue
            j = seen.get(v)
            if j is None:
                seen[v] = i
            else:
                # Shared-contact guard: don't merge if names are very different
                score = token_sort_ratio(rows[i]["name_normalized"], rows[j]["name_normalized"])
                if score >= 60:
                    uf.union(i, j)

    union_by_key("phone_e164")
    union_by_key("email_normalized")

    # Exact name+DOB match
    name_dob_seen: dict[str, int] = {}
    for i, r in enumerate(rows):
        name = r["name_normalized"]
        if name and r["dob_month"] and r["dob_day"]:
            key = f"{name}|{r['dob_month']}-{r['dob_day']}"
            j = name_dob_seen.get(key)
            if j is None:
                name_dob_seen[key] = i
            else:
                uf.union(i, j)

    # Pick survivor per cluster (most complete row, earliest tiebreak).
    clusters = uf.groups()
    pass_through_cols = [c for c in rows[0].keys()
                         if c not in {"name_normalized", "phone_e164", "email_normalized", "dob_month", "dob_day"}]

    members: list[dict[str, str]] = []
    for _, idxs in clusters.items():
        idxs.sort()
        best = idxs[0]
        best_filled = sum(1 for c in pass_through_cols if rows[best].get(c, "").strip())
        for i in idxs[1:]:
            filled = sum(1 for c in pass_through_cols if rows[i].get(c, "").strip())
            if filled > best_filled:
                best = i
                best_filled = filled
        survivor = dict(rows[best])
        # Fill empty fields from other cluster members.
        for i in idxs:
            if i == best:
                continue
            for c in pass_through_cols:
                if not survivor.get(c, "").strip() and rows[i].get(c, "").strip():
                    survivor[c] = rows[i][c]
        survivor["_source"] = "core"
        survivor["_needs_review"] = ""
        members.append(survivor)

    print(f"Core: {n} rows → {len(members)} after dedup")

    # ── 3. Merge birthday list ────────────────────────────────────────────
    if bday_path and bday_path.exists():
        bday_rows = load_csv(bday_path)
        if not {"name", "birthday_mm_dd"} <= set(bday_rows[0].keys()):
            print("WARNING: birthday.csv must have columns: name, birthday_mm_dd", file=sys.stderr)
        else:
            # Build lookup: (dob_month, dob_day) → list of member indices
            dob_index: dict[str, list[int]] = {}
            for i, m in enumerate(members):
                k = f"{m['dob_month']}|{m['dob_day']}"
                if m["dob_month"] and m["dob_day"]:
                    dob_index.setdefault(k, []).append(i)

            matched = 0
            added = 0
            flagged = 0
            for br in bday_rows:
                bname = normalize_name(br.get("name", ""))
                bm, bd = parse_month_day(br.get("birthday_mm_dd", ""))
                if not bname or not bm or not bd:
                    continue

                # Find candidates with same DOB
                candidates = dob_index.get(f"{bm}|{bd}", [])
                scored = [(i, token_sort_ratio(bname, members[i]["name_normalized"]))
                          for i in candidates]
                scored.sort(key=lambda x: x[1], reverse=True)

                if scored and scored[0][1] >= 85:
                    matched += 1  # Already in core, nothing to do.
                elif scored and scored[0][1] >= 60:
                    # Ambiguous — flag for human review
                    flagged += 1
                    members[scored[0][0]]["_needs_review"] = (
                        f"birthday name '{br.get('name','')}' score={scored[0][1]}"
                    )
                else:
                    # Not in core — add as birthday-only member
                    added += 1
                    members.append({
                        "full_name": br.get("name", ""),
                        "phone": "",
                        "email": "",
                        "dob": br.get("birthday_mm_dd", ""),
                        "name_normalized": bname,
                        "phone_e164": "",
                        "email_normalized": "",
                        "dob_month": bm,
                        "dob_day": bd,
                        "_source": "birthday_only",
                        "_needs_review": "",
                    })

            print(f"Birthdays: {len(bday_rows)} entries → {matched} matched, {added} added, {flagged} flagged")

    # ── 4. Assign member IDs & write output ───────────────────────────────
    members.sort(key=lambda m: (m.get("name_normalized", ""), m.get("dob_month", ""), m.get("dob_day", "")))
    for i, m in enumerate(members, 1):
        m["member_id"] = f"M{i:04d}"

    # Column order: member_id first, then original CSV columns, then internal.
    internal = {"name_normalized", "phone_e164", "email_normalized", "dob_month", "dob_day"}
    output_cols = ["member_id"]
    output_cols += [c for c in rows[0].keys() if c not in internal]
    output_cols += ["_source", "_needs_review"]

    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "master_members.csv"
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=output_cols, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(members)

    review_count = sum(1 for m in members if m.get("_needs_review"))
    print(f"\nWrote {len(members)} members to {out_file}")
    if review_count:
        print(f"  ⚠ {review_count} rows flagged with _needs_review")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Merge core members + birthday list into one clean CSV.")
    parser.add_argument("--core", required=True, help="Path to core members CSV")
    parser.add_argument("--birthdays", default=None, help="Path to birthday CSV (name, birthday_mm_dd)")
    parser.add_argument("--out", default="out", help="Output directory (default: out/)")
    args = parser.parse_args()

    run(
        core_path=Path(args.core),
        bday_path=Path(args.birthdays) if args.birthdays else None,
        out_dir=Path(args.out),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
