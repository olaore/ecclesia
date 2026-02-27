Subject: Review Request: Member Data Harmonization (Core Sheet Dedup + Legacy Birthdays Merge)

I’m working on cleaning up fragmented church admin data that currently lives across Google Forms/Sheets and legacy birthday lists. The biggest pain is that the “core” Google Form sheet (the most complete dataset) contains duplicates and inconsistent values, and the legacy birthdays dataset needs to be merged back into the same canonical member list.

## Problem to Solve

- Produce one canonical row per real person from the core Google Sheet export.
- Preserve an audit trail of duplicates and conflicting field values so we don’t silently lose information.
- Merge legacy birthdays (now confirmed as a PDF) by linking birthday entries back to members using conservative fuzzy matching, and route ambiguous cases to human review.

## What I Implemented (Local-First Scripts, No Cloud AI)

A Python CLI pipeline that:

- Normalizes the core CSV export (name, email, phone, DOB parts).
- Deduplicates the core dataset using exact keys (phone/email/name+DOB) plus conservative fuzzy matching within blocks.
- Merges duplicates with “core sheet wins” behavior while logging conflicts to an audit file.
- Loads birthdays from a manually-verified CSV (`name,birthday_mm_dd`) and parses month/day.
- Links birthdays to members using month/day filtering + name similarity scoring.
- Auto-links only when confidence is high; otherwise generates a `match_review.csv` for human decisions and supports re-running with a filled decisions file.

## Key Outputs

- `out/master_members.csv`: deduped canonical members
- `out/core_duplicates.csv`: duplicate clusters for review
- `out/audit_conflicts.csv`: field-level conflicts detected during merge
- `out/birthdays_all.csv`, `out/birthdays_unlinked.csv`, `out/match_review.csv`: birthday linking workflow
- `out/sqlite_import/members.csv`, `out/sqlite_import/birthdays.csv`: normalized exports for future DB import

## Repo Entrypoints / Code

- CLI: `scripts/harmonize.py`
- Pipeline: `src/nehemiah_harmonize/pipeline.py`
- Core normalization + column mapping: `src/nehemiah_harmonize/core.py`, config in `config/example.config.yaml`
- Dedup/merge: `src/nehemiah_harmonize/dedup.py`
- Birthday CSV load/parsing: `src/nehemiah_harmonize/birthdays_csv.py`
- Birthday matching/review loop: `src/nehemiah_harmonize/match_birthdays.py`
- Tests: `tests/` (run with `pytest`)

## Important Dataset Specifics Handled

- Core headers include both `Email` and `Email Address`; the config prefers `Email Address`.
- The core birthday field is `Birthday (Month/Day)`; numeric inputs like `1/2` are interpreted as Month/Day (Jan 2), not Day/Month.

## What I Want You to Review

- Correctness and safety of the dedup strategy (risk of over-merging vs under-merging).
- Merge policy (“core wins” + conflict audit): are we preserving enough provenance and conflict detail?
- Birthday PDF parsing robustness: will it work across real-world formatting variations, and is the scanned-PDF failure mode acceptable?
- Matching thresholds and the review workflow: are auto-link conditions conservative enough; is the review CSV clear and actionable?
- Any missing edge cases (e.g., multiple people sharing birthday+similar name, missing DOB, shared phones, etc.).
- Code quality: structure, readability, determinism, and test coverage.

## How to Run (For Reviewer)

Core-only:

```sh
python scripts/harmonize.py --core data/core.csv --out out --config config/example.config.yaml
```

Core + birthdays:

```sh
python scripts/harmonize.py --core data/core.csv --birthdays data/birthday.csv --out out --config config/example.config.yaml
```

If `out/match_review.csv` is generated, fill `decision` with:

- `link:M000123`
- `unlinked`

Then re-run with:

```sh
python scripts/harmonize.py --core data/core.csv --birthdays data/birthday.csv --out out --config config/example.config.yaml --decisions out/match_review.csv
```

## Notes / Constraints

- This is intentionally script-first and local-first to minimize privacy risk; no member data is sent to external AI services.
- Birthdays source is a CSV (`name,birthday_mm_dd`).
