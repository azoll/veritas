# Test Brief v3 — Answer Key (20+ citations with 4 planted issues)

A consolidated Title VII opposition + cross-motion to compel. Realistic
authority mix: 13 cases + 4 statutes + 3 federal rules + 1 constitutional cite = **21 citations**.

The brief plants 4 specific issues that the verifier should surface:

---

## PLANTED ISSUES (the four to catch)

### 🔴 Planted Issue #1 — Fabricated case
**Citation:** `Henderson v. National Marine Underwriters, 562 F.4th 891, 905 (4th Cir. 2024)`
**Failure mode:** Wholly fabricated. No such case exists.
**Expected verdict:** **existence/risk** — "No opinion published at 562 F.4th 891" via CourtListener `/citation-lookup/`.

### 🔴 Planted Issue #2 — Fabricated case in U.S. Reports
**Citation:** `Martinelli v. Pacific Coast Logistics, LLC, 538 U.S. 412, 419 (2023)`
**Failure mode:** Wholly fabricated. The year (2023) is inconsistent with volume 538 of U.S. Reports (volume 538 covers cases from October 2002 term). A real fabrication of a Supreme Court case.
**Expected verdict:** **existence/risk** — "No opinion published at 538 U.S. 412."

### 🟡 Planted Issue #3 — Real case + real quote, but misused for an unrelated proposition
**Citation:** `Brown v. Board of Education, 347 U.S. 483, 495 (1954)`
**Quoted language:** `"in the field of public education, the doctrine of 'separate but equal' has no place"` — this IS the actual famous quote from Brown.
**Failure mode:** The brief uses Brown as authority for an "equal access to information in discovery" proposition. Brown is the landmark school-desegregation case. It has nothing to do with civil discovery rules.
**Expected verdict:** **existence/verified**, **pincite/verified** (quote IS in the opinion), but **proposition/risk** — AI should catch that the cited holding does not support the asserted discovery-access proposition.

### 🟡 Planted Issue #4 — Real case + fabricated quote
**Citation:** `Anderson v. Liberty Lobby, Inc., 477 U.S. 242, 255 (1986)`
**Quoted language (in brief):** `"summary judgment should be granted only when the moving party can demonstrate beyond a reasonable doubt that no factual disputes exist"` — invented. The "beyond a reasonable doubt" formulation is the criminal-trial standard; civil summary judgment is not held to that standard.
**Failure mode:** Real, leading civil-procedure case, but the attributed quote is not in the opinion AND the legal standard it articulates ("beyond a reasonable doubt") is wrong for civil summary judgment.
**Expected verdict:** **existence/verified**, **pincite/risk** — "Quoted language was not located in the cited opinion."

### 🔴 Planted Issue #5 — Typo'd citation (correct case, wrong volume/page)
**Citation in brief:** `Pennoyer v. Neff, 95 U.S. 174, 720 (1877)`
**Real citation:** `Pennoyer v. Neff, 95 U.S. 714 (1877)` — note: brief has page **174** (transposed digits) instead of **714**.
**Failure mode:** Common typo. Pennoyer is a real case; "95 U.S. 174" is a different opinion (Hagar v. Reclamation Dist., not actually relevant). Veritas should treat this as existence/risk because there is no Pennoyer at 95 U.S. 174.
**Expected verdict:** **existence/risk** — citation-lookup will resolve to a different case (Hagar) OR not_found. Either way the brief's claim that Pennoyer is at this citation is wrong. May also surface as a name-mismatch if the lookup succeeds for a different case at that page.

---

## LEGITIMATELY CORRECT CITATIONS (should verify cleanly)

These 16 should all return clean verdicts; they're the noise the verifier must filter through:

### Cases
1. ✅ `Hickman v. Taylor, 329 U.S. 495, 507 (1947)` — real + real quote + supports the discovery-liberality proposition
2. ✅ `Upjohn Co. v. United States, 449 U.S. 383, 392 (1981)` — real, cited correctly for attorney-client privilege scope
3. ✅ `Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579, 596 (1993)` — real, used CORRECTLY here (Daubert IS the expert-testimony admissibility standard)
4. ✅ `Bell Atlantic Corp. v. Twombly, 550 U.S. 544, 570 (2007)` — real, correctly cited for pleading standard
5. ✅ `Ashcroft v. Iqbal, 556 U.S. 662, 678 (2009)` — real, correctly cited
6. ✅ `Celotex Corp. v. Catrett, 477 U.S. 317, 323 (1986)` — real, correctly cited for summary judgment burden
7. ✅ `Matsushita Elec. Indus. Co. v. Zenith Radio Corp., 475 U.S. 574, 587 (1986)` — real, correctly cited
8. ✅ `Erie R.R. v. Tompkins, 304 U.S. 64, 78 (1938)` — real, correctly cited
9. ✅ `Lujan v. Defenders of Wildlife, 504 U.S. 555, 560-61 (1992)` — real, correctly cited for standing
10. ✅ `International Shoe Co. v. Washington, 326 U.S. 310, 316 (1945)` — real, correctly cited for personal jurisdiction
11. ✅ `World-Wide Volkswagen Corp. v. Woodson, 444 U.S. 286, 297 (1980)` — real, correctly cited
12. ✅ `McDonnell Douglas Corp. v. Green, 411 U.S. 792, 802 (1973)` — real, correctly cited for Title VII burden-shifting

### Statutes (federal)
13. ✅ `28 U.S.C. § 1331` — federal question jurisdiction — real
14. ✅ `28 U.S.C. § 1332` — diversity jurisdiction — real
15. ✅ `42 U.S.C. § 2000e-5` — Title VII enforcement — real
16. ✅ `42 U.S.C. § 1981` — civil rights — real (NOT in v2; new here)
17. ✅ `42 U.S.C. § 2000e-2(m)` — Title VII motivating-factor — real

### Federal Rules
18. ✅ `Fed. R. Civ. P. 56(a)` — summary judgment — real
19. ✅ `Fed. R. Civ. P. 26(b)(1)` — discovery scope — real, quote should match
20. ✅ `Fed. R. Civ. P. 12(b)(6)` — motion to dismiss — real
21. ✅ `Fed. R. Civ. P. 702` — expert testimony — real (also mentioned in Daubert paragraph)
22. ✅ `Fed. R. Civ. P. 37` — discovery sanctions / motion to compel — real

### Constitutional citation
23. ✅ `U.S. Const. amend. XIV, § 1` — real (Equal Protection)

### Parallel + duplicate-style citation
24. **Duplicate test:** `Twombly, 550 U.S. 544, 570 (2007)` appears once correctly AND once as `Twombly, 550 U.S. 554, 570 (2007)` later (typo'd to volume 554). The parallel-cite dedup should NOT fold these — they have different volumes/pages so they're treated as separate.

---

## Summary expectations

| Metric | Expected |
|---|---|
| Total citations extracted | 21–24 (depending on whether duplicate Twombly fold or not) |
| Kind breakdown | ~13 cases + 5 statutes + 5 rules + 1 constitutional |
| Verified | 16–18 |
| Risk | 4 (Henderson fabrication, Martinelli fabrication, Pennoyer typo, Anderson quote mismatch) |
| Warning or proposition-risk | 1 (Brown misuse) |
| Confidence score | ~50–65 |

## The harder test for the AI proposition check

The **Brown v. Board** case is the centerpiece. Existence and pincite will both verify (real case, real quote). The AI is the only check that can catch that the brief is misusing it — the cited authority does not support the asserted proposition. This is the same shape of catch as the v2 Upjohn-for-sanctions and Daubert-for-discovery-proportionality misuses, but in a case where the misuse is more rhetorical (Brown's actual holding is one of the most famous in American law and obviously about school desegregation, not discovery rules).

If the AI flags Brown as a proposition-mismatch, the platform's central claim ("we don't just check citations exist, we check they support what they're offered for") is reinforced on a case where any reader would immediately agree.
