from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class Config:
    core_columns: dict[str, list[str]]
    phone_region: str
    dob_month_day_month_first: bool
    core_fuzzy_threshold: int
    max_block_size: int
    auto_link_threshold: int
    review_threshold: int
    top_candidates: int


def load_config(path: Path) -> Config:
    raw: dict[str, Any] = yaml.safe_load(path.read_text(encoding="utf-8"))

    core_columns = raw.get("core_columns", {})
    defaults = raw.get("defaults", {})
    dedup = raw.get("dedup", {})
    birthdays = raw.get("birthdays", {})

    return Config(
        core_columns={k: list(v) for k, v in core_columns.items()},
        phone_region=str(defaults.get("phone_region", "NG")),
        dob_month_day_month_first=bool(defaults.get("dob_month_day_month_first", True)),
        core_fuzzy_threshold=int(dedup.get("core_fuzzy_threshold", 95)),
        max_block_size=int(dedup.get("max_block_size", 200)),
        auto_link_threshold=int(birthdays.get("auto_link_threshold", 92)),
        review_threshold=int(birthdays.get("review_threshold", 80)),
        top_candidates=int(birthdays.get("top_candidates", 5)),
    )
