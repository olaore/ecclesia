# Code Review: Member Data Harmonization Pipeline

**Date**: 2026-02-22  
**Scope**: Full review per `REVIEW_REQUEST.md` — dedup strategy, merge policy, birthday matching, edge cases, code quality.  
**Update**: Birthdays source changed from PDF to CSV (`data/birthday.csv`, 103 entries, `name,birthday_mm_dd` format). This change has been applied in the pipeline.

---

## Overall Impression

This is solid, pragmatic work. The architecture is clean — normalization, dedup, merge, and birthday linking are well-separated into focused modules. The local-first, privacy-conscious design is the right call for church member data. The config-driven column mapping and threshold tuning are thoughtful.

---

## Architectural Change: PDF → CSV for Birthdays

The original pipeline used `pdftotext` to extract birthday data from a legacy PDF. During review, we identified a **critical parsing bug**: the PDF used numbered lists (`1.  Adebayo Anike  Jan 1st`) and the `_LEADING_DAY` regex was reading serial numbers as birthday days — every entry got the wrong day.

**Decision**: Replace the PDF with a manually-verified CSV (`data/birthday.csv`) with columns `name,birthday_mm_dd`.

**Why this is the right call**:

| Concern | PDF approach | CSV approach |
|---------|-------------|--------------|
| **Accuracy** | Serial numbers misread as days; every entry wrong | Human-verified, 100% accurate |
| **Complexity** | 147 lines of fragile regex in `birthdays_pdf.py` + `pdftotext` system dependency | ~5 lines of `pd.read_csv()` |
| **Maintainability** | New PDF formats require new regex patterns | Add rows to a CSV |
| **Failure modes** | Silent — wrong days with no error | Obvious — missing/malformed rows fail on read |
| **External deps** | Requires `pdftotext` (Poppler) on PATH | None |
| **Privacy** | Same | Same |

This is a one-time legacy import, not a recurring feed. Engineering a robust PDF parser for a single document you can read in 5 minutes is over-engineering. The CSV is the source of truth now.

**Impact on codebase**:
- `birthdays_pdf.py` removed; pipeline now loads `--birthdays` as CSV via `birthdays_csv.py`
- CLI `--birthdays` flag expects CSV (`name,birthday_mm_dd`)
- `pdftotext` system dependency removed

---

## 1. Dedup Strategy — Correctness and Safety

### What's Good

- **Three-tier exact matching** (phone → email → name+DOB) via Union-Find is correct and efficient.
- **Fuzzy matching is conservatively scoped**: threshold 95 with blocking by `last_initial:dob_month` prevents runaway cross-merges.
- **Sub-blocking** by first-name initial inside each block further reduces false-positive comparisons.
- **DOB disagreement guard** (`dedup.py` L147–152) correctly prevents merging when both rows have month/day and they differ.
- Skipped oversized blocks are surfaced in the audit output.

### Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Shared phone/email → over-merge** | **High** | Parents often file their children's details using their own phone or email. A family sharing one phone number or email gets unioned into a single person, **reducing the row count below the true core member count.** This is the biggest real-world risk for this dataset. |
| **Transitive closure via Union-Find** | Medium | If A↔B by phone and B↔C by email, A and C merge even if they are different people. Combined with the shared-phone issue, this can cascade across a family. |
| **Blocking key catch-all** | Low | `last_initial:dob_month` means `"A:xx"` (no month) is a catch-all bucket. Guarded by `max_block_size`, but rows with missing DOB months silently skip fuzzy dedup if the bucket exceeds 200. |

### Recommendation — Shared Contact Guard

**Key invariant**: The final member count after dedup should never be less than the true number of unique people in the core sheet.

Add a name-similarity gate to phone/email matching:

```python
# Instead of blindly unioning by phone:
#   uf.union(i, j)
# Require a minimum name-similarity check:
name_i = core_df.at[i, "name_normalized"]
name_j = core_df.at[j, "name_normalized"]
if token_sort_ratio(name_i, name_j) >= 60:
    uf.union(i, j)
else:
    # Log as "shared contact, different person" for audit
    pass
```

Also add a post-merge sanity check:

```python
ratio = len(merged_df) / len(core_df)
if ratio < 0.85:
    warnings.warn(f"Dedup reduced rows to {ratio:.0%} of input — possible over-merge")
```

---

## 2. Merge Policy and Conflict Audit

### What's Good

- **Completeness-based survivor selection** with deterministic tie-breaking by `_core_row_id`.
- **Field-wise conflict audit** with `alternatives` pipe-delimited list.
- **`_cluster_row_ids`** preserves full provenance.

### Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Non-deterministic fill order** | Medium | `dedup.py` L268–279: when the survivor has an empty field, it fills from `values[0]` — the first non-empty across cluster rows. But `idxs` iterates in arbitrary order, not sorted by `_core_row_id`. **Fix**: sort `idxs` by `_core_row_id` before iterating. |
| **"alternatives" naming** | Low | The column contains ALL distinct values (including chosen), not just alternatives. Consider renaming to `all_values`. |

### Fix — Deterministic Fill

```diff
 for _, idxs in clusters.items():
     if not idxs:
         continue
+    idxs = sorted(idxs, key=lambda x: int(core_df.at[x, "_core_row_id"]))
     for i in idxs:
         used.add(i)
```

---

## 3. Birthday Data (Now CSV)

### What Changed

The birthday source is now `data/birthday.csv` with 103 entries:

```csv
name,birthday_mm_dd
Adebayo Anike,01/01
Miss Odebunmi Oluwadayofunmi,01/10
...
```

### What Needs Updating in Code

Applied: the pipeline now expects a birthdays CSV path and loads it via `birthdays_csv.py`.

1. **Accept CSV instead of PDF** — change `--birthdays` to expect a CSV file
2. **Load and split** — parse `birthday_mm_dd` into `month` and `day` integer columns:
   ```python
   bdf = pd.read_csv(birthdays_csv_path, dtype=str, keep_default_na=False)
   parts = bdf["birthday_mm_dd"].str.split("/", expand=True)
   bdf["month"] = parts[0].astype(int)
   bdf["day"] = parts[1].astype(int)
   bdf["entry_id"] = [f"B{i:06d}" for i in range(1, len(bdf) + 1)]
   ```
3. **Remove** `pdftotext` dependency from README and requirements docs
4. **Deprecate or remove** `birthdays_pdf.py`

### Data Quality Notes on the CSV

Spot-checked the 103 entries:

- **Honorifics inconsistency**: some entries have `Mr`, `Mrs`, `Miss`, `Dr`, `Pastor`, `Rev'd Dr.`, `Chief (Mrs)`, `Bro` — these need stripping before name matching. The `normalize_name()` function already handles most of these via `_HONORIFICS`, but **`Rev'd`** and **`Chief`** are not in the set. Add them.
- **One typo**: `Aribisala Dayid` (row 66) — likely "David". Not a code issue, but worth correcting in the CSV.
- **One typo**: `Oyegoke Victorla Adejoke` (row 54) — likely "Victoria". Same — CSV fix.

---

## 4. Matching Thresholds and Review Workflow

### What's Good

- **Auto-link requires both high score (≥92) AND ≥3 point gap** — conservative and correct.
- **Review CSV includes top 5 candidates with scores** — actionable for human reviewers.
- **`apply_decisions`** supports re-running with filled decisions.
- Missing month context → always routes to review.

### Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Decision member_ids aren't validated** | Low | A typo like `link:M999999` silently creates an invalid link. Consider validating that the `member_id` exists. |
| **`token_sort_ratio` vs `token_set_ratio`** | Low | Dedup uses `token_sort_ratio`, birthday matching uses `token_set_ratio`. Both are fine for their contexts, but document why they differ. |

---

## 5. Missing Edge Cases

| Edge Case | Current Handling | Suggested |
|-----------|-----------------|-----------|
| **Family sharing phone/email** | Silently merged | Shared-contact guard (see §1) — **highest priority** |
| **Members with no DOB, no phone, no email** | Fuzzy only; skip if bucket > 200 | Document this limitation |
| **Duplicate birthday CSV entries** | Each row attempts to match independently | Dedup by `(name_normalized, month, day)` before matching |
| **Unicode/accented names** | `re.UNICODE` used, but `SequenceMatcher` works on raw chars | Apply `unicodedata.normalize('NFKD', ...)` |
| **Empty core CSV** | `UnionFind(0)`, downstream may fail on missing columns | Early return with correctly-shaped empty DataFrames |
| **Missing honorifics in normalize** | `Rev'd`, `Chief` not in `_HONORIFICS` set | Add them (see §3 data quality notes) |

---

## 6. Code Quality Assessment

### Structure & Readability — A-

Clean module boundaries, frozen dataclasses, type annotations throughout.

### Determinism — B+

Member IDs assigned by stable sort. **Gap**: fill-from-cluster order is non-deterministic (see §2).

### Test Coverage — C (Weakest Area)

| Test file | Covers | Missing |
|-----------|--------|---------|
| `test_normalize.py` | Email, name, phone, DOB (4 tests) | Accented names, `Rev'd`/`Chief` honorifics, non-NG phones |
| `test_birthdays_parse.py` | PDF parsing (now obsolete) | Replace with CSV loading tests |
| *(none)* | — | **No tests for**: dedup, merge, match_birthdays, pipeline, core |

Priority tests to add:
1. Two rows with same phone merge correctly
2. Two rows with same phone but different names do NOT merge (after shared-contact guard)
3. Conflict audit captures field disagreements
4. `apply_decisions` round-trip
5. CSV birthday loading + month/day split

### Bugs Found

| Location | Issue | Fix |
|----------|-------|-----|
| **`config/example.config.yaml` L8** | `email` column mapping lists `"email"` before `"Email Address"`. Since `_pick_col` returns the first match, if the sheet has both columns, it uses `Email` — **contradicting the comment**. | Swap to: `["Email Address", "email", "Email"]` |
| **`normalize.py` `_HONORIFICS`** | Missing `rev'd`, `chief`, `rev` (with `'d`), `bro` is present but `chief` is not | Add `"rev'd"`, `"chief"` to the set |

---

## Summary — Prioritized Action Items

| Priority | Item | Effort |
|----------|------|--------|
| 🔴 **P0** | Update pipeline to accept birthday CSV instead of PDF (load, split mm/dd, assign entry_ids) | 30 min |
| 🔴 **P0** | Add shared-phone/email guard to prevent family over-merge | 30 min |
| 🔴 **P0** | Fix email column ordering in config (swap `"email"` and `"Email Address"`) | 1 min |
| 🔴 **P0** | Add tests for dedup/merge logic (5 minimum) | 1–2 hrs |
| 🟡 **P1** | Make cluster fill-order deterministic (sort `idxs`) | 5 min |
| 🟡 **P1** | Add `Rev'd`, `Chief` to `_HONORIFICS` | 2 min |
| 🟡 **P1** | Add post-merge row-count sanity warning | 5 min |
| 🟡 **P1** | Fix CSV typos: `Dayid` → `David`, `Victorla` → `Victoria` | 2 min |
| 🟢 **P2** | Validate decision `member_id`s | 15 min |
| 🟢 **P2** | Remove/deprecate `birthdays_pdf.py` and `pdftotext` dependency | 10 min |
| 🟢 **P2** | NFKD Unicode normalization | 10 min |
| 🟢 **P2** | Empty-DataFrame guards | 15 min |

---

**Bottom line**: The pipeline's core design is sound. Replacing the birthday PDF with a human-verified CSV was the right call — it eliminated 147 lines of fragile regex, a system dependency, and a critical parsing bug where serial numbers were read as birthday days. The remaining gaps are:

1. **Shared-contact over-merge** — parents + kids sharing a phone/email silently reduces the member count.
2. **Pipeline update needed** — code still expects a PDF, needs updating to consume the new CSV.
3. **Email config bug** — column priority contradicts documented intent.
4. **No tests on dedup/merge** — the riskiest logic is untested.

Once these are addressed, the pipeline is production-ready.
