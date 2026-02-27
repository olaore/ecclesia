# Nehemiah Data Harmonization

This repo contains local-first scripts to clean/deduplicate a core Google Sheet export and merge legacy birthday records.

## Privacy

- Outputs go to `out/` and inputs are expected in `data/` (both ignored by git).
- The pipeline runs locally; it does not send member data to any external AI service.

## Inputs

- `data/core.csv`: CSV export of the Google Form backing sheet (must include headers).
  - The config is set up for headers like:
    - `Timestamp, Full Name, Email, Address, Phone Number, Marital Status, Occupation, Birthday (Month/Day), Department you belong to, Email Address, Comments`
  - The DOB field `Birthday (Month/Day)` is interpreted as Month/Day (e.g., `1/2` => Jan 2).
- `data/birthday.csv` (optional): legacy birthday list as CSV with columns `name,birthday_mm_dd` (e.g. `01/10`).

## Setup

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

Core-only:

```sh
python scripts/harmonize.py --core data/core.csv --out out --config config/example.config.yaml
```

Core + birthdays CSV:

```sh
python scripts/harmonize.py --core data/core.csv --birthdays data/birthday.csv --out out --config config/example.config.yaml
```

## Outputs

- `out/master_members.csv`: deduplicated canonical members table
- `out/core_duplicates.csv`: duplicate clusters (audit)
- `out/shared_contact_suspects.csv`: same phone/email but low name similarity (potential family/shared contacts)
- `out/audit_conflicts.csv`: non-empty conflicting values found during merge
- `out/dedup_warning.txt`: written when dedup reduces rows unusually far
- `out/match_review.csv`: human review queue for ambiguous birthday matches (only if needed)
- `out/birthdays_all.csv`: parsed birthday entries with `member_id` when linked
- `out/birthdays_duplicates.csv`: duplicate birthday CSV rows dropped before matching (audit)
- `out/birthdays_unlinked.csv`: birthday entries not linked to any member
- `out/invalid_decisions.csv`: decisions referencing non-existent member IDs (if any)
- `out/sqlite_import/members.csv`, `out/sqlite_import/birthdays.csv`: normalized exports for later DB import

If `out/match_review.csv` is produced, fill the `decision` column with:
- `link:M000123`
- `unlinked`

Then re-run with:

```sh
python scripts/harmonize.py --core data/core.csv --birthdays data/birthday.csv --out out --config config/example.config.yaml --decisions out/match_review.csv
```

## Troubleshooting

- If your core CSV headers differ, edit `config/example.config.yaml` to add the exact header names under `core_columns`.
