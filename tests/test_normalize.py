from nehemiah_harmonize.normalize import normalize_email, normalize_name, normalize_phone, parse_dob


def test_normalize_email() -> None:
    assert normalize_email(" Test@Example.com ") == "test@example.com"
    assert normalize_email("not-an-email") is None


def test_normalize_name() -> None:
    assert normalize_name("  Dr. John   Doe ") == "john doe"
    assert normalize_name("Pastor  Jane-Doe") == "jane doe"


def test_normalize_phone_ng() -> None:
    raw, e164 = normalize_phone("0803 123 4567", "NG")
    assert raw
    assert e164 and e164.startswith("+234")


def test_parse_dob_full_and_partial() -> None:
    d1 = parse_dob("1990-01-02")
    assert d1.year == 1990 and d1.month == 1 and d1.day == 2
    d2 = parse_dob("2 Jan")
    assert d2.year is None and d2.month == 1 and d2.day == 2
    d3 = parse_dob("1/2", month_first_if_no_year=True)
    assert d3.year is None and d3.month == 1 and d3.day == 2
