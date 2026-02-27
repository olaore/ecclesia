from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd

from nehemiah_harmonize.config import Config
from nehemiah_harmonize.normalize import normalize_email, normalize_name, normalize_phone, parse_dob


def _pick_col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    cols_lower = {c.lower(): c for c in df.columns}
    for cand in candidates:
        c = cols_lower.get(cand.lower())
        if c is not None:
            return c
    return None


@dataclass(frozen=True)
class CoreColumns:
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    gender: Optional[str]
    address: Optional[str]
    dob: Optional[str]
    timestamp: Optional[str]
    marital_status: Optional[str]
    occupation: Optional[str]
    department: Optional[str]
    comments: Optional[str]


def resolve_core_columns(df: pd.DataFrame, config: Config) -> CoreColumns:
    cc = config.core_columns
    return CoreColumns(
        first_name=_pick_col(df, cc.get("first_name", [])),
        last_name=_pick_col(df, cc.get("last_name", [])),
        full_name=_pick_col(df, cc.get("full_name", [])),
        phone=_pick_col(df, cc.get("phone", [])),
        email=_pick_col(df, cc.get("email", [])),
        gender=_pick_col(df, cc.get("gender", [])),
        address=_pick_col(df, cc.get("address", [])),
        dob=_pick_col(df, cc.get("dob", [])),
        timestamp=_pick_col(df, cc.get("timestamp", [])),
        marital_status=_pick_col(df, cc.get("marital_status", [])),
        occupation=_pick_col(df, cc.get("occupation", [])),
        department=_pick_col(df, cc.get("department", [])),
        comments=_pick_col(df, cc.get("comments", [])),
    )


def load_core_csv(path: Path) -> pd.DataFrame:
    # Keep everything as strings to avoid losing leading zeros etc.
    return pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[])


def build_core_canonical(df: pd.DataFrame, cols: CoreColumns, config: Config) -> pd.DataFrame:
    work = df.copy()
    work.insert(0, "_core_row_id", range(1, len(work) + 1))

    def get(col: Optional[str], i: int) -> str:
        if col is None:
            return ""
        v = work.at[i, col]
        return "" if v is None else str(v)

    full_names: list[str] = []
    first_names: list[str] = []
    last_names: list[str] = []
    phones_raw: list[str] = []
    phones_e164: list[str] = []
    emails_norm: list[str] = []
    emails_raw: list[str] = []
    genders: list[str] = []
    addresses: list[str] = []
    timestamps: list[str] = []
    marital_statuses: list[str] = []
    occupations: list[str] = []
    departments: list[str] = []
    comments: list[str] = []
    dob_years: list[str] = []
    dob_months: list[str] = []
    dob_days: list[str] = []
    dob_isos: list[str] = []
    names_norm: list[str] = []

    for i in range(len(work)):
        fn = get(cols.first_name, i).strip()
        ln = get(cols.last_name, i).strip()
        full = get(cols.full_name, i).strip()
        if not full:
            full = " ".join([p for p in [fn, ln] if p]).strip()

        phone_raw, phone_e164 = normalize_phone(get(cols.phone, i), config.phone_region)
        email_raw = get(cols.email, i).strip()
        email_norm = normalize_email(email_raw)
        name_norm = normalize_name(full)
        dob_hint_month_day = False
        if cols.dob is not None and "month/day" in str(cols.dob).lower():
            dob_hint_month_day = True
        dob = parse_dob(
            get(cols.dob, i),
            month_first_if_no_year=(config.dob_month_day_month_first or dob_hint_month_day),
        )

        full_names.append(full)
        first_names.append(fn)
        last_names.append(ln)
        phones_raw.append(phone_raw or "")
        phones_e164.append(phone_e164 or "")
        emails_norm.append(email_norm or "")
        emails_raw.append(email_raw)
        genders.append(get(cols.gender, i).strip() if cols.gender else "")
        addresses.append(get(cols.address, i).strip() if cols.address else "")
        timestamps.append(get(cols.timestamp, i).strip() if cols.timestamp else "")
        marital_statuses.append(get(cols.marital_status, i).strip() if cols.marital_status else "")
        occupations.append(get(cols.occupation, i).strip() if cols.occupation else "")
        departments.append(get(cols.department, i).strip() if cols.department else "")
        comments.append(get(cols.comments, i).strip() if cols.comments else "")
        dob_years.append("" if dob.year is None else str(dob.year))
        dob_months.append("" if dob.month is None else str(dob.month))
        dob_days.append("" if dob.day is None else str(dob.day))
        dob_isos.append(dob.iso() or "")
        names_norm.append(name_norm or "")

    work["full_name"] = full_names
    work["first_name"] = first_names
    work["last_name"] = last_names
    work["phone_raw"] = phones_raw
    work["phone_e164"] = phones_e164
    work["email_raw"] = emails_raw
    work["email_normalized"] = emails_norm
    work["gender"] = genders
    work["address"] = addresses
    work["timestamp"] = timestamps
    work["marital_status"] = marital_statuses
    work["occupation"] = occupations
    work["department_raw"] = departments
    work["comments"] = comments
    work["dob_year"] = dob_years
    work["dob_month"] = dob_months
    work["dob_day"] = dob_days
    work["dob_iso"] = dob_isos
    work["name_normalized"] = names_norm

    return work


def write_csv(path: Path, df: pd.DataFrame) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, quoting=csv.QUOTE_MINIMAL)
