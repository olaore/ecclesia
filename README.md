# Nehemiah Data Harmonization

One script to merge a core Google Sheet export + legacy birthday list into a single clean CSV.

## Privacy

- Outputs go to `out/`, inputs in `data/` (both gitignored).
- Runs locally. No external services.

## Inputs

### `data/core.csv` (required)

Google Form export. **These 4 headers must be present** (case-insensitive, spaces become underscores):

| Header | Example |
|---|---|
| `Full Name` | `ALADE MARVELOUS ADEWALE` |
| `Phone` | `08137219996` |
| `Email` | `alade@gmail.com` |
| `DOB` | `8/27` (Month/Day) |

All other columns pass through untouched.

### `data/birthday.csv` (optional)

Legacy birthday list: `name,birthday_mm_dd` (e.g. `Adebayo Anike,01/01`).

## Setup

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```sh
python scripts/harmonize.py --core data/core.csv --birthdays data/birthday.csv
```

## Output

**One file:** `out/master_members.csv`

Columns include `member_id`, all original CSV columns, plus:
- `_source`: `core` or `birthday_only`
- `_needs_review`: empty if clean, otherwise describes the ambiguity
