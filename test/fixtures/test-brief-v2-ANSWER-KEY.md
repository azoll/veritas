# Test Brief v2 — Expected Verification Outcomes

## Authorities cited

### Cases
1. **Hickman v. Taylor, 329 U.S. 495, 507 (1947)** — REAL. Quote is real. Cited correctly for liberal discovery. → All three checks should be **verified**.
2. **Hickman, 329 U.S. at 510** — SHORT-FORM back-reference to #1. Should resolve to Hickman.
3. **Halverson v. Pacific Western Mutual, 547 F.4th 1182, 1191 (9th Cir. 2024)** — FABRICATED. → Existence should be **risk** (not located).
4. **Upjohn Co. v. United States, 449 U.S. 383, 392 (1981)** — REAL case, but: (a) the quote is INVENTED; (b) Upjohn is the attorney-client privilege case, NOT a sanctions case. → Quote should be **risk** (not located in opinion). Proposition should be **risk** (cited authority contradicts).
5. **Smith v. Acme, 2024 WL 1234567, at *4 (S.D.N.Y. Mar. 5, 2024)** — Westlaw-only cite (fabricated, but unverifiable in our corpus). → Existence should be **unknown** with "we don't have a license to the Westlaw corpus" advisory.
6. **Daubert v. Merrell Dow, 509 U.S. 579, 596 (1993)** — REAL case being misused. Daubert is the expert-testimony admissibility case, not a "discovery is presumed reasonable" case. → Existence **verified**, proposition **warning** or **risk**.

### Statutes (new in v2!)
7. **28 U.S.C. § 1331** — Federal question jurisdiction. Real. → Existence **verified** via Cornell LII. Proposition **verified** — this is exactly what § 1331 does.
8. **42 U.S.C. § 1988(b)** — Civil rights attorney's-fee shifting. Real. → Existence **verified**. Proposition **verified** if Daubert was a civil rights case... actually this is a litigation that doesn't appear to be 1983, so the AI may flag that § 1988 fees might not be available. Either verified or warning is acceptable.

### Federal Rules (new in v2!)
9. **Fed. R. Civ. P. 26(b)(1)** — Discovery scope rule. Real. The brief quotes the rule's actual text. → Existence **verified** via Cornell LII. Pincite should locate the quoted language. Proposition **verified**.
10. **Fed. R. Civ. P. 37(b)(2)(A)** — Sanctions rule. Real. → Existence **verified**. Proposition **verified**.

## Summary expectations

- **Total citations extracted:** 10 (8 long-form authorities + 2 short-form / structural)
- **By kind:** 4 cases + 2 statutes + 2 rules + 1 WL + 1 short-form
- **Risk:** 2 (Halverson fabrication + Upjohn quote/proposition mismatch)
- **Warning:** 0–1 (Daubert proposition)
- **Unknown:** 1 (WL cite — licensing flag, not a problem)
- **Verified:** 5+ (Hickman, statutes, rules)
