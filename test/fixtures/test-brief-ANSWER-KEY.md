# Test Brief — Answer Key

Four planted citations, one per detector. Designed as a controlled test
of Veritas's verification pipeline. Run `test-brief.txt` (or save as
DOCX/PDF and upload) through `/scan` or a deep-scan dashboard upload,
then compare the report against this key.

---

## Citation 1 — CLEAN CONTROL

**`Hickman v. Taylor, 329 U.S. 495, 507 (1947)`**

Quoted: *"Mutual knowledge of all the relevant facts gathered by both
parties is essential to proper litigation."*

| Check | Expected Verdict | Why |
|---|---|---|
| Existence | ✅ Confirmed | Hickman v. Taylor is a foundational discovery case, well-indexed in CourtListener |
| Treatment | ✅ Confirmed | Supreme Court precedent, still good law |
| Pincite / quote | ✅ Confirmed | This quotation is **verbatim** from the opinion (Justice Murphy, slip op. at 507) |
| Proposition (deep only) | ✅ Supports | Used correctly to support the breadth-of-discovery principle |

**Overall verdict: CONFIRMED (green)**

---

## Citation 2 — FABRICATED CASE

**`Halverson v. Pacific Western Mutual, 547 F.4th 1182, 1191 (9th Cir. 2024)`**

Quoted: *"blanket relevance objections, lodged without substantive
particularization of the burden alleged, are insufficient as a matter
of law to defeat a properly-served Rule 34 request."*

| Check | Expected Verdict | Why |
|---|---|---|
| Existence | ❌ Not found in reporter | This case does not exist. 547 F.4th likely hasn't been published; case name and quote are fabricated |
| Treatment | (skipped — case not found) | |
| Pincite / quote | (skipped — case not found) | |
| Proposition (deep only) | (skipped — case not found) | |

**Overall verdict: NOT LOCATED IN REPORTER (red)**

This is the headline failure mode — the *Mata v. Avianca* category that
courts have been sanctioning since 2023.

---

## Citation 3 — QUOTATION MISMATCH

**`Upjohn Co. v. United States, 449 U.S. 383, 392 (1981)`**

Quoted: *"discovery sanctions must be applied severely upon any showing
of willful evasion, with no requirement that the moving party
demonstrate prejudice."*

| Check | Expected Verdict | Why |
|---|---|---|
| Existence | ✅ Confirmed | Upjohn is a real Supreme Court case on attorney-client privilege for corporate clients |
| Treatment | ✅ Confirmed | Precedential, still cited |
| Pincite / quote | ❌ Not located in cited opinion | The quoted language does not appear in Upjohn. The actual case is about whether the attorney-client privilege protects communications between counsel and middle-management corporate employees — it says nothing about discovery sanctions or "willful evasion" |
| Proposition (deep only) | ❌ Unsupported | Upjohn doesn't address sanctions at all |

**Overall verdict: REVIEW RECOMMENDED (amber)** — case exists but the
quotation cannot be verified against the source.

---

## Citation 4 — PROPOSITION MISMATCH (subtle)

**`Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579, 596 (1993)`**

Cited (no quote) for the proposition that *"discovery requests must be
presumed reasonable absent an affirmative showing of bad faith by the
responding party."*

| Check | Expected Verdict | Why |
|---|---|---|
| Existence | ✅ Confirmed | Daubert is a famous Supreme Court case on expert testimony admissibility |
| Treatment | ✅ Confirmed | Precedential |
| Pincite / quote | (skipped — no quote attributed) | |
| Proposition (deep only) | ❌ Unsupported / contradicts | Daubert is about Rule 702 and the gatekeeping function for expert testimony — has **nothing** to do with discovery scope or proportionality. The brief is using a real case to support an unrelated proposition |

**Overall verdict:**
- On **standard scan**: ✅ **CONFIRMED (false negative)** — without proposition validation, this slips through. The brief looks credible because the citation exists.
- On **deep scan** (proposition validation enabled via AI Gateway): ⚠️ **REVIEW RECOMMENDED** — proposition flagged as unsupported.

This is the most strategically important citation in the test. It
demonstrates why Veritas's deep scan is materially different from a
commodity citation checker — the cite is real, the case is good law, the
formatting is correct. Only a system that actually **reads** the cited
opinion and compares it to the proposition can catch this. It also
illustrates the most dangerous failure mode in real practice: lawyers
citing real cases for propositions they don't support, often because an
AI assistant suggested the cite without reading the holding.

---

## Roll-up scorecard (Standard scan, what `/scan` runs)

| Citation | Existence | Pincite | Treatment | Roll-up |
|---|---|---|---|---|
| 1. Hickman v. Taylor | ✅ | ✅ | ✅ | **CONFIRMED** |
| 2. Halverson v. Pac. W. Mut. | ❌ | — | — | **NOT LOCATED** |
| 3. Upjohn Co. v. U.S. | ✅ | ❌ | ✅ | **REVIEW** |
| 4. Daubert v. Merrell Dow | ✅ | (no quote) | ✅ | **CONFIRMED** (false negative) |

**Standard-scan roll-up: 1 risk, 1 review, 2 confirmed** — but Daubert is
a hidden false negative.

## Roll-up scorecard (Deep scan, with proposition validation)

| Citation | Existence | Pincite | Treatment | Proposition | Roll-up |
|---|---|---|---|---|---|
| 1. Hickman v. Taylor | ✅ | ✅ | ✅ | ✅ supports | **CONFIRMED** |
| 2. Halverson v. Pac. W. Mut. | ❌ | — | — | — | **NOT LOCATED** |
| 3. Upjohn Co. v. U.S. | ✅ | ❌ | ✅ | ❌ | **REVIEW** |
| 4. Daubert v. Merrell Dow | ✅ | (no quote) | ✅ | ❌ unsupported | **REVIEW** |

**Deep-scan roll-up: 1 risk, 2 review, 1 confirmed** — the false negative
is caught.

---

## Notes for the test run

- The **trial flow at `/scan`** runs standard scan only (proposition
  validation is gated behind sign-up + paid plan, per the strategic
  blueprint). Expect 2 verified, 1 review, 1 risk — Daubert will appear
  to pass.
- A **deep scan** requires sending `deep=true` on the document upload.
  The current dashboard `UploadDropzone` doesn't expose this toggle yet
  — it's an API-only flag. To run deep verification, either:
  1. Build a "Deep verification" checkbox on the upload form (small
     follow-up task), or
  2. Run the upload via `curl` with `-F deep=true` as a one-off.
- Two real-world caveats that could affect verdicts:
  1. **CourtListener corpus gaps** — extremely old cases or very recent
     opinions might not be in their index. If Hickman comes back as "not
     located," that's a corpus problem, not a brief problem.
  2. **Quotation matching is fuzzy** — small punctuation/whitespace
     differences in the opinion's plain-text vs. the brief's quote can
     produce a partial-match (warning) instead of a clean confirm. Watch
     the match score on the Hickman quote; it should be ≥95% for a green
     verdict.
