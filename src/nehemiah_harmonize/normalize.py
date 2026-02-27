from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from dateutil import parser as date_parser
from datetime import datetime


_HONORIFICS = {
    "mr",
    "mrs",
    "ms",
    "miss",
    "dr",
    "pastor",
    "pst",
    "bro",
    "br",
    "sis",
    "sister",
    "rev",
    "revd",
    "reverend",
    "chief",
}


def _clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def normalize_email(email_raw: Optional[str]) -> Optional[str]:
    if email_raw is None:
        return None
    email = _clean_spaces(str(email_raw)).lower()
    if not email or "@" not in email:
        return None
    return email


def normalize_phone(phone_raw: Optional[str], region: str) -> tuple[Optional[str], Optional[str]]:
    if phone_raw is None:
        return (None, None)
    s = str(phone_raw).strip()
    if not s:
        return (None, None)

    digits = re.sub(r"\D", "", s)
    if not digits:
        return (s, None)

    # Minimal E.164 normalization with a pragmatic Nigeria default.
    # This avoids external deps; it's not a full international parser.
    reg = (region or "NG").upper()
    if reg == "NG":
        # Common patterns:
        # - 08031234567 (11 digits) => +2348031234567
        # - 2348031234567 (13 digits) => +2348031234567
        # - +2348031234567 => +2348031234567
        if digits.startswith("234") and len(digits) >= 12:
            return (s, f"+{digits}")
        if digits.startswith("0") and len(digits) == 11:
            return (s, "+234" + digits[1:])
        # Already looks like an international number without '+'
        if len(digits) >= 11 and not digits.startswith("0"):
            return (s, "+" + digits)
        return (s, None)

    # Generic fallback: if it already looks like a country-code-prefixed number, keep it.
    if len(digits) >= 11 and not digits.startswith("0"):
        return (s, "+" + digits)
    return (s, None)


def normalize_name(full_name: Optional[str]) -> Optional[str]:
    if full_name is None:
        return None
    s = _clean_spaces(str(full_name))
    if not s:
        return None
    # Normalize common contractions before stripping punctuation.
    s = re.sub(r"\brev['’]d\b", "revd", s, flags=re.IGNORECASE)
    # Remove punctuation except spaces.
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    s = _clean_spaces(s).lower()

    tokens = [t for t in s.split(" ") if t]
    tokens = [t for t in tokens if t not in _HONORIFICS]
    if not tokens:
        return None
    return " ".join(tokens)


@dataclass(frozen=True)
class DobParts:
    year: Optional[int]
    month: Optional[int]
    day: Optional[int]

    def iso(self) -> Optional[str]:
        if self.year and self.month and self.day:
            return f"{self.year:04d}-{self.month:02d}-{self.day:02d}"
        return None


def parse_dob(dob_raw: Optional[str], *, month_first_if_no_year: bool = False) -> DobParts:
    if dob_raw is None:
        return DobParts(None, None, None)
    s = _clean_spaces(str(dob_raw))
    if not s:
        return DobParts(None, None, None)

    # Common patterns with missing year: "2 Jan", "02/01", "Jan 2", "2nd January"
    s2 = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", s.lower())

    # Try month-name aware parsing first
    try:
        iso_like = bool(re.match(r"^\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*$", s2))
        # For inputs without a year, dateutil may interpret "1/2" using day-first rules.
        # If the source field is explicitly Month/Day, handle that in the numeric fallback instead.
        dt = date_parser.parse(s2, dayfirst=(not iso_like), yearfirst=iso_like, default=datetime(1900, 1, 1))
        # dateutil always supplies a year; we treat "year present" as: contains 4 digits in input.
        year_present = bool(re.search(r"\b(19|20)\d{2}\b", s2))
        if not year_present and month_first_if_no_year and re.match(r"^\s*\d{1,2}[/-]\d{1,2}\s*$", s2):
            raise ValueError("force numeric fallback for month/day input")
        return DobParts(dt.year if year_present else None, dt.month, dt.day)
    except Exception:
        pass

    # Fallback: numeric mm/dd or dd/mm without year
    m = re.match(r"^\s*(\d{1,2})[/-](\d{1,2})\s*$", s2)
    if m:
        a = int(m.group(1))
        b = int(m.group(2))
        if month_first_if_no_year:
            month = a
            day = b
        else:
            # Ambiguous: assume dayfirst => dd/mm
            day = a
            month = b
        if 1 <= month <= 12 and 1 <= day <= 31:
            return DobParts(None, month, day)

    return DobParts(None, None, None)
