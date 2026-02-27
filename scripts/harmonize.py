#!/usr/bin/env python3
from __future__ import annotations

import argparse
import pathlib
import sys

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
_SRC = _REPO_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from nehemiah_harmonize.pipeline import run_pipeline


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Deduplicate core members CSV and merge legacy birthdays CSV into a clean master export."
    )
    parser.add_argument("--core", required=True, help="Path to core members CSV export")
    parser.add_argument("--birthdays", required=False, help="Path to birthdays CSV (legacy): name,birthday_mm_dd")
    parser.add_argument("--out", default="out", help="Output directory (default: out/)")
    parser.add_argument(
        "--config",
        default="config/example.config.yaml",
        help="YAML config (default: config/example.config.yaml)",
    )
    parser.add_argument(
        "--decisions",
        default=None,
        help="Optional match_review.csv with filled decisions to apply",
    )
    args = parser.parse_args(argv)

    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    run_pipeline(
        core_csv_path=pathlib.Path(args.core),
        birthdays_csv_path=pathlib.Path(args.birthdays) if args.birthdays else None,
        out_dir=out_dir,
        config_path=pathlib.Path(args.config),
        decisions_csv_path=pathlib.Path(args.decisions) if args.decisions else None,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
