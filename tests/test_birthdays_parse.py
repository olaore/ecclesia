from pathlib import Path

from nehemiah_harmonize.birthdays_csv import load_birthdays_csv


def test_load_birthdays_csv(tmp_path: Path) -> None:
    p = tmp_path / "birthday.csv"
    p.write_text("name,birthday_mm_dd\nJohn Doe,01/02\nJohn Doe,01/02\nMary Jane,12/31\n", encoding="utf-8")
    res = load_birthdays_csv(p)
    assert len(res.birthdays) == 2
    assert len(res.duplicates) == 1
