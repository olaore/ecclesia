from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from nehemiah_harmonize.normalize import normalize_name


@dataclass(frozen=True)
class BirthdayCsvLoadResult:
    birthdays: pd.DataFrame
    duplicates: pd.DataFrame


def load_birthdays_csv(path: Path) -> BirthdayCsvLoadResult:
    """
    Expected columns:
      - name
      - birthday_mm_dd  (e.g. "01/10")

    Output columns:
      - entry_id, name_raw, name_normalized, month, day
    """
    df = pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[])
    cols_lower = {c.lower(): c for c in df.columns}

    name_col = cols_lower.get("name")
    bday_col = cols_lower.get("birthday_mm_dd")
    if name_col is None or bday_col is None:
        raise ValueError("birthdays CSV must have columns: name,birthday_mm_dd")

    names: list[str] = []
    names_norm: list[str] = []
    months: list[str] = []
    days: list[str] = []
    for i in range(len(df)):
        name_raw = str(df.at[i, name_col]).strip()
        mmdd = str(df.at[i, bday_col]).strip()
        if not name_raw or not mmdd:
            names.append(name_raw)
            names_norm.append(normalize_name(name_raw) or "")
            months.append("")
            days.append("")
            continue

        parts = mmdd.split("/")
        if len(parts) != 2:
            raise ValueError(f"Invalid birthday_mm_dd at row {i+1}: {mmdd!r} (expected MM/DD)")
        mm = parts[0].strip().zfill(2)
        dd = parts[1].strip().zfill(2)
        mmi = int(mm)
        ddi = int(dd)
        if not (1 <= mmi <= 12 and 1 <= ddi <= 31):
            raise ValueError(f"Invalid birthday_mm_dd at row {i+1}: {mmdd!r} (out of range)")

        names.append(name_raw)
        names_norm.append(normalize_name(name_raw) or "")
        months.append(str(mmi))
        days.append(str(ddi))

    out = pd.DataFrame(
        {
            "entry_id": [f"B{i:06d}" for i in range(1, len(df) + 1)],
            "name_raw": names,
            "name_normalized": names_norm,
            "month": months,
            "day": days,
        }
    )

    # Deduplicate identical entries to reduce repeated matching.
    key = out["name_normalized"].astype(str).str.strip() + "|" + out["month"].astype(str) + "|" + out["day"].astype(str)
    dup_mask = key.duplicated(keep="first")
    duplicates = out[dup_mask].copy()
    out = out[~dup_mask].copy().reset_index(drop=True)

    return BirthdayCsvLoadResult(birthdays=out, duplicates=duplicates.reset_index(drop=True))

