/**
 * Citation extraction — two passes.
 *
 * Pass 1 (deterministic): regex scan for every supported authority type:
 *   - Cases:     "410 U.S. 113", "123 F.3d 456", "550 U.S. 544 (2007)"
 *   - Statutes:  "28 U.S.C. § 1331", "42 U.S.C. § 1983(a)"
 *   - Rules:     "Fed. R. Civ. P. 26(b)(1)", "Fed. R. Evid. 702"
 *   - Westlaw:   "2024 WL 1234567"
 *   - Lexis:     "2024 U.S. Dist. LEXIS 12345"
 *
 * This catches >80% of real cites with zero LLM cost.
 *
 * Pass 2 (LLM, optional): hand the document to a model with the regex hits as
 * scaffolding and ask it to (a) attach a case name, (b) add any citations the
 * regex missed (string cites, short forms, supra refs), and (c) capture any
 * direct quotation attributed to that case along with the surrounding sentence
 * for proposition analysis.
 *
 * The LLM step is gated behind AI_GATEWAY_API_KEY — without one, we still
 * get a usable, demo-able citation list from regex alone.
 */

import { z } from "zod";

// Authority kind written to citations.kind in the DB. Used by the
// verifier to pick the right downstream pipeline.
export type CitationKind =
  | "case"
  | "statute"
  | "state-statute"
  | "rule"
  | "constitution"
  | "slip"
  | "westlaw"
  | "lexis";

// State-reporter coverage. Extended past the original short list to
// cover the major state-court reporters most litigators cite.
const REPORTER =
  "(?:U\\.?\\s?S\\.?" +
  "|S\\.?\\s?Ct\\.?" +
  "|L\\.?\\s?Ed\\.?(?:\\.?\\s?2d)?" +
  "|F\\.?\\s?(?:2d|3d|4th|App'x|Supp\\.?(?:\\s?2d|\\s?3d)?)" +
  "|F\\.?" +
  "|B\\.?\\s?R\\.?" +
  "|T\\.?\\s?C\\.?(?:\\s?M\\.?)?" +
  "|Cl\\.?\\s?Ct\\.?" +
  "|Fed\\.?\\s?Cl\\.?" +
  "|A\\.?(?:2d|3d)?" +
  "|N\\.?E\\.?(?:2d|3d)?" +
  "|N\\.?W\\.?(?:2d|3d)?" +
  "|S\\.?E\\.?(?:2d|3d)?" +
  "|S\\.?W\\.?(?:2d|3d)?" +
  "|P\\.?(?:2d|3d)?" +
  "|So\\.?(?:2d|3d)?" +
  "|Cal\\.?(?:Rptr\\.?(?:\\s?2d|\\s?3d)?|App\\.?(?:\\s?2d|\\s?3d|\\s?4th)?)?" +
  "|Wn\\.?(?:2d)?" +
  "|N\\.?Y\\.?(?:2d|3d)?" +
  "|Mass\\.?(?:\\s?App\\.?\\s?Ct\\.?)?" +
  "|Tex\\.?(?:\\s?App\\.?)?" +
  "|Pa\\.?(?:\\s?Super\\.?|\\s?Commw\\.?)?" +
  "|Ill\\.?(?:2d|\\s?App\\.?\\s?(?:2d|3d)?)?" +
  "|Ohio\\s?St\\.?(?:2d|3d)?" +
  "|Mich\\.?(?:\\s?App\\.?)?" +
  "|Va\\.?(?:\\s?App\\.?)?" +
  "|Md\\.?(?:\\s?App\\.?)?" +
  "|N\\.?J\\.?(?:\\s?Super\\.?)?" +
  "|Conn\\.?(?:\\s?App\\.?)?" +
  "|N\\.?H\\.?" +
  "|Vt\\.?" +
  "|Me\\.?" +
  "|R\\.?I\\.?" +
  "|Ga\\.?(?:\\s?App\\.?)?" +
  "|Ariz\\.?(?:\\s?App\\.?)?" +
  "|Colo\\.?(?:\\s?App\\.?)?" +
  "|Or\\.?(?:\\s?App\\.?)?" +
  "|Idaho" +
  "|Mont\\.?" +
  "|Nev\\.?" +
  "|Utah(?:\\s?2d)?" +
  "|Wyo\\.?" +
  "|Alaska" +
  "|Haw\\.?(?:\\s?App\\.?)?" +
  "|Kan\\.?(?:\\s?App\\.?(?:\\s?2d)?)?" +
  "|Mo\\.?(?:\\s?App\\.?)?" +
  "|Ark\\.?(?:\\s?App\\.?)?" +
  "|Iowa" +
  "|Minn\\.?(?:\\s?App\\.?)?" +
  "|Neb\\.?(?:\\s?App\\.?)?" +
  "|N\\.?D\\.?" +
  "|S\\.?D\\.?" +
  "|N\\.?C\\.?(?:\\s?App\\.?)?" +
  "|S\\.?C\\.?(?:\\s?App\\.?)?" +
  "|W\\.?Va\\.?" +
  "|Wis\\.?(?:2d)?" +
  ")";

// Case name covers four shapes:
//   - Adversarial:  "Smith v. Jones"
//   - Relator:      "Smith ex rel. Doe v. Jones"
//   - In re:        "In re Smith" or "In re Smith Industries, Inc."
//   - Estate of:    "Estate of Smith v. Jones"
const CASE_NAME =
  "(?:" +
  // "In re X" or "Matter of X"
  "(?:In\\s+re|Matter\\s+of|Estate\\s+of)\\s+(?:[A-Z][A-Za-z'.&,\\-]+(?:\\s+[A-Z][A-Za-z'.&,\\-]+){0,5})" +
  "|" +
  // Standard "X v. Y" — allows "ex rel." in either side
  "(?:[A-Z][A-Za-z'.&,\\-]+(?:\\s+(?:ex\\s+rel\\.\\s+)?[A-Z][A-Za-z'.&,\\-]+){0,5})" +
  "\\s+v\\.\\s+" +
  "(?:[A-Z][A-Za-z'.&,\\-]+(?:\\s+(?:ex\\s+rel\\.\\s+)?[A-Z][A-Za-z'.&,\\-]+){0,5})" +
  ")";

const CITE_RE = new RegExp(
  // optional case name — capital-initialed words then " v. " then capital words, ending before the volume number
  `(${CASE_NAME})?` +
    `\\s*,?\\s*` +
    // volume reporter page
    `(\\d{1,4})\\s+(${REPORTER})\\s+(\\d{1,5})` +
    // optional pinpoint
    `(?:,\\s*(\\d{1,5}))?` +
    // optional parenthetical court / year
    `(?:\\s*\\(([^)]{1,80})\\))?`,
  "g",
);

// U.S. and state constitutional citations: "U.S. Const. amend. V",
// "U.S. Const. art. III, § 2", "Cal. Const. art. I, § 1".
const CONSTITUTION_RE = new RegExp(
  "((?:U\\.?\\s?S\\.?|Ala|Alaska|Ariz|Ark|Cal|Colo|Conn|Del|Fla|Ga|Haw|Idaho|Ill|Ind|Iowa|Kan|Ky|La|Me|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|Nev|N\\.?H|N\\.?J|N\\.?M|N\\.?Y|N\\.?C|N\\.?D|Ohio|Okla|Or|Pa|R\\.?I|S\\.?C|S\\.?D|Tenn|Tex|Utah|Vt|Va|Wash|W\\.?Va|Wis|Wyo)\\.?)\\s+" +
  "Const\\.?\\s+" +
  // either "amend. X" or "art. III, § 2"
  "(?:" +
  "amend\\.?\\s+([IVXLC]+|\\d+)" +
  "|" +
  "art\\.?\\s+([IVXLC]+|\\d+)" +
  "(?:,?\\s*§§?\\s*(\\d+(?:\\([^)]+\\))?))?" +
  ")",
  "gi",
);

// Slip opinion / docket-only references: "No. 21-cv-1701 (N.D. Ala. July
// 23, 2025)", "Case No. 2023-CV-456 (D.D.C. 2024)". These are recent
// or unreported decisions that don't yet have a published reporter cite.
const SLIP_OPINION_RE = new RegExp(
  "(?:No\\.|Case\\s+No\\.|Civil\\s+(?:Action\\s+)?No\\.)\\s*" +
  "([0-9]+[\\-:][\\w\\-]+)" + // docket like "21-cv-1701" or "2023-CV-456"
  "\\s*\\(([^)]{3,80})\\)", // parenthetical with court + date
  "g",
);

// Statute regex. Handles U.S.C. (federal) and the most common
// state-statute citation formats. Section symbols can be § or "Sec."
// or "sec." or just bare numbers after "U.S.C.".
const STATUTE_RE = new RegExp(
  "(\\d{1,3})\\s+" +
  "(U\\.?\\s?S\\.?\\s?C\\.?(?:A\\.?)?" +
  "|C\\.?\\s?F\\.?\\s?R\\.?" +
  ")" +
  "\\s*(?:§§?|Sec\\.|sec\\.)\\s*" +
  "(\\d+[\\w\\-.]*(?:\\([^)]+\\))*)",
  "g",
);

// State statutes: "Fla. Stat. § 90.502", "Cal. Penal Code § 187",
// "N.Y. Penal Law § 125.25", "Tex. Bus. & Com. Code § 17.46".
const STATE_STATUTE_RE = new RegExp(
  "((?:Ala|Alaska|Ariz|Ark|Cal|Colo|Conn|Del|D\\.?C|Fla|Ga|Haw|Idaho|Ill|Ind|Iowa|Kan|Ky|La|Me|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|Nev|N\\.?H|N\\.?J|N\\.?M|N\\.?Y|N\\.?C|N\\.?D|Ohio|Okla|Or|Pa|R\\.?I|S\\.?C|S\\.?D|Tenn|Tex|Utah|Vt|Va|Wash|W\\.?Va|Wis|Wyo)\\.?" +
  "(?:\\s+(?:Rev|Cons|Comp|Ann|Stat|Code|Civ|Penal|Bus|Com|Health|Welf|Lab|Educ|Pub|Gov|Fam|Prob|Civ\\.?\\s?Proc|R\\.?\\s?Civ\\.?\\s?P)\\.?)+)" +
  "\\s*§§?\\s*(\\d+[\\w\\-.]*(?:\\([^)]+\\))*)",
  "g",
);

// Federal Rules: "Fed. R. Civ. P. 26", "Fed. R. Evid. 702", "Fed. R.
// App. P. 4", "Fed. R. Crim. P. 11", "Fed. R. Bankr. P. 7001".
const FED_RULE_RE = new RegExp(
  "Fed\\.?\\s?R\\.?\\s?" +
  "(Civ|Crim|Evid|App|Bankr)\\.?\\s?(?:P\\.?)?\\s+" +
  "(\\d+(?:\\.\\d+)?(?:\\([^)]+\\))*)",
  "g",
);

// Westlaw cites: "2024 WL 1234567".
const WESTLAW_RE = new RegExp(
  "(\\d{4})\\s+WL\\s+(\\d{1,8})",
  "g",
);

// Lexis cites: "2024 U.S. Dist. LEXIS 12345", "2025 U.S. App. LEXIS 6789",
// "2024 N.Y. Misc. LEXIS 4567".
const LEXIS_RE = new RegExp(
  "(\\d{4})\\s+([A-Z][A-Za-z.\\s]{2,30}?)\\s+LEXIS\\s+(\\d{1,8})",
  "g",
);

// Short-form back-reference: "Hickman, 329 U.S. at 510" or
// "Smith v. Jones, 123 F.3d at 460". Resolves to a previously-extracted
// long-form citation via case name match.
const SHORT_FORM_RE = new RegExp(
  // case name fragment (one or two capitalized words; allow "v.")
  "([A-Z][A-Za-z'.&\\-]+(?:\\s+v\\.\\s+[A-Z][A-Za-z'.&\\-]+)?)" +
  ",\\s+(\\d{1,4})\\s+(" + REPORTER + ")\\s+(?:at\\s+)?(\\d{1,5})",
  "g",
);

export type ExtractedCitation = {
  /** What kind of authority this is — drives which verifier runs. */
  kind: CitationKind;
  rawText: string;
  caseName?: string;
  /** Reporter (cases), "U.S.C." (statutes), "Fed. R. Civ. P." (rules), "WL" / "LEXIS" (online). */
  reporter: string;
  /** Volume (cases / WL year) — set to year for WL/Lexis to keep the shape uniform. */
  volume: string;
  /** Page number for cases; section number for statutes; rule number for rules; document number for WL/Lexis. */
  page: string;
  pinpointPage?: string;
  parenthetical?: string;
  court?: string;
  year?: number;
  startOffset: number;
  endOffset: number;
  contextSnippet: string;
};

function snippet(text: string, start: number, end: number, pad = 220): string {
  const s = Math.max(0, start - pad);
  const e = Math.min(text.length, end + pad);
  return text.slice(s, e).replace(/\s+/g, " ").trim();
}

export function extractCitationsRegex(text: string): ExtractedCitation[] {
  const out: ExtractedCitation[] = [];
  const seen = new Set<string>();
  const claimed: Array<{ start: number; end: number }> = [];

  // Helper: skip if this offset overlaps a span we've already
  // claimed for a different authority type. Lexis cites collide with
  // case cites for example ("2024 U.S. LEXIS 12345" looks like
  // "2024 U.S. 12345" to the case regex), and we want the more
  // specific match to win.
  const overlaps = (start: number, end: number) =>
    claimed.some((s) => !(end <= s.start || start >= s.end));
  const claim = (start: number, end: number) => claimed.push({ start, end });

  // Match order matters: most-specific patterns first.

  // 1. Westlaw
  for (const m of text.matchAll(WESTLAW_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const key = `wl:${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "westlaw",
      rawText: m[0].trim(),
      reporter: "WL",
      volume: m[1],
      page: m[2],
      year: Number(m[1]),
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 2. Lexis
  for (const m of text.matchAll(LEXIS_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const key = `lexis:${m[1]}:${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "lexis",
      rawText: m[0].trim(),
      reporter: `${m[2].trim()} LEXIS`,
      volume: m[1],
      page: m[3],
      year: Number(m[1]),
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 2b. Constitutions (federal + state) — must run before case regex
  // because "U.S. Const." starts with "U.S." which the case regex
  // would otherwise greedily try to claim.
  for (const m of text.matchAll(CONSTITUTION_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const sovereign = m[1].replace(/\s+/g, " ").trim();
    const amendment = m[2];
    const article = m[3];
    const section = m[4];
    // "page" stores the address: "amend. V" or "art. III § 2"
    const address = amendment
      ? `amend. ${amendment}`
      : `art. ${article}${section ? ` § ${section}` : ""}`;
    const key = `const:${sovereign}:${address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "constitution",
      rawText: m[0].trim(),
      reporter: `${sovereign} Const.`,
      volume: "",
      page: address,
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 2c. Slip opinions / docket-only references
  for (const m of text.matchAll(SLIP_OPINION_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const docket = m[1].trim();
    const paren = m[2].trim();
    // Only treat as a slip opinion if the parenthetical looks like a
    // court + date (contains a year). Otherwise this is some random
    // numeric reference.
    if (!/\b(1[89]|20)\d{2}\b/.test(paren)) continue;
    const yearMatch = paren.match(/\b(1[89]\d{2}|20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;
    const court = paren.replace(/\b(1[89]\d{2}|20\d{2})\b/, "").replace(/,?\s*$/, "").trim();
    const key = `slip:${docket}:${court}:${year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "slip",
      rawText: m[0].trim(),
      reporter: "Slip op.",
      volume: "",
      page: docket,
      court: court || undefined,
      year,
      parenthetical: paren,
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 3. Federal Rules
  for (const m of text.matchAll(FED_RULE_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const ruleSet = `Fed. R. ${m[1]}. P.`;
    const key = `rule:${ruleSet}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "rule",
      rawText: m[0].trim(),
      reporter: ruleSet,
      volume: "",
      page: m[2], // rule number, e.g. "26(b)(1)"
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 4. Federal statutes (U.S.C., C.F.R.)
  for (const m of text.matchAll(STATUTE_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const reporter = m[2].replace(/\s+/g, "").replace(/\.+$/, "");
    const key = `stat:${m[1]}:${reporter}:${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "statute",
      rawText: m[0].trim(),
      reporter, // e.g. "U.S.C." or "C.F.R."
      volume: m[1], // title number
      page: m[3], // section number, e.g. "1983(a)"
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 5. State statutes — flagged distinctly so the verifier can route
  // them to per-state lookups rather than Cornell LII.
  for (const m of text.matchAll(STATE_STATUTE_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const code = m[1].replace(/\s+/g, " ").trim();
    const key = `state-stat:${code}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    out.push({
      kind: "state-statute",
      rawText: m[0].trim(),
      reporter: code,
      volume: "",
      page: m[2],
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  // 6. Case citations (last — most general, lowest priority).
  // We also fold parallel cites into the first occurrence: when two
  // cites appear back-to-back at the same location and share a case
  // name, we keep only the first and stash the rest as `parallel`
  // strings for display, so a verifier doesn't make three CL calls
  // for one underlying case.
  const caseMatches: Array<{
    whole: string;
    caseName?: string;
    volume: string;
    reporter: string;
    page: string;
    pin?: string;
    paren?: string;
    start: number;
    end: number;
  }> = [];

  for (const match of text.matchAll(CITE_RE)) {
    const [whole, caseName, volume, reporter, page, pin, paren] = match;
    const start = match.index ?? 0;
    const end = start + whole.length;
    if (overlaps(start, end)) continue;
    const key = `case:${volume}:${reporter}:${page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claim(start, end);
    caseMatches.push({
      whole,
      caseName,
      volume,
      reporter: reporter.replace(/\s+/g, " ").trim(),
      page,
      pin,
      paren,
      start,
      end,
    });
  }

  // Fold parallel citations using a "chain head" cursor. A typical
  // Bluebook parallel cite reads "Case, 329 U.S. 495, 67 S. Ct. 385,
  // 91 L. Ed. 451 (1947)" — we want to keep only the first and treat
  // the rest as the same authority. The challenge: each parallel
  // sits within ~30 chars of the previous one, but the third
  // parallel is >60 chars from the first. So instead of pairwise
  // comparison, we walk left-to-right and grow a chain as long as
  // each new match continues to look like a parallel of the head.
  caseMatches.sort((a, b) => a.start - b.start);
  const dropped = new Set<number>();
  let chainHead: number | null = null;
  let chainTailEnd = 0;
  for (let i = 0; i < caseMatches.length; i++) {
    const curr = caseMatches[i];
    if (chainHead === null) {
      chainHead = i;
      chainTailEnd = curr.end;
      continue;
    }
    const head = caseMatches[chainHead];
    const gapFromTail = curr.start - chainTailEnd;
    // Parallels of the same case sit shoulder-to-shoulder in the
    // source, typically separated by ", " (2 chars). >40 means a
    // string cite or new sentence.
    if (gapFromTail < 0 || gapFromTail > 40) {
      chainHead = i;
      chainTailEnd = curr.end;
      continue;
    }
    const headName = head.caseName?.split(/\s/)[0];
    const currName = curr.caseName?.split(/\s/)[0];
    const namesAgree =
      !currName || (headName !== undefined && currName === headName);
    if (namesAgree) {
      // Same case — fold curr into head and extend the tail.
      dropped.add(i);
      chainTailEnd = curr.end;
    } else {
      chainHead = i;
      chainTailEnd = curr.end;
    }
  }

  // After parallel detection: a "pinpoint" we captured may actually
  // be the VOLUME of an adjacent parallel cite. Pattern:
  //   "329 U.S. 495, 67 S. Ct. 385" → regex captures vol=329,
  //   page=495, pin=67, but "67" is really the volume of the
  //   "S. Ct. 385" parallel. Detect that by looking at the source
  //   text immediately after the match: a leading "<REPORTER> <n>"
  //   sequence means the pin is bogus and should be stripped.
  const reporterTokenRE = new RegExp(`^\\s*${REPORTER}\\s+\\d{1,5}\\b`);
  for (const m of caseMatches) {
    if (!m.pin) continue;
    const after = text.slice(m.end, m.end + 40);
    if (reporterTokenRE.test(after)) m.pin = undefined;
  }

  for (let i = 0; i < caseMatches.length; i++) {
    if (dropped.has(i)) continue;
    const c = caseMatches[i];
    let year: number | undefined;
    let court: string | undefined;
    if (c.paren) {
      const yearMatch = c.paren.match(/\b(1[89]\d{2}|20\d{2})\b/);
      if (yearMatch) year = Number(yearMatch[1]);
      court = c.paren.replace(/\b(1[89]\d{2}|20\d{2})\b/, "").trim() || undefined;
    }
    // Normalize whitespace inside rawText — multi-line case names
    // (e.g. when "v." breaks across a line in the source PDF) read
    // ugly in the report UI otherwise.
    const rawText = c.whole.replace(/\s+/g, " ").trim();
    out.push({
      kind: "case",
      rawText,
      caseName: c.caseName?.replace(/\s+/g, " ").trim(),
      volume: c.volume,
      reporter: c.reporter,
      page: c.page,
      pinpointPage: c.pin,
      parenthetical: c.paren,
      court,
      year,
      startOffset: c.start,
      endOffset: c.end,
      contextSnippet: snippet(text, c.start, c.end),
    });
  }

  return out;
}

/**
 * Extract direct quotations attributed to a citation. Heuristic: the
 * LAST quoted passage preceding the citation marker, within ~600
 * chars. Critically, the search window is clamped to start AFTER the
 * end of the previous citation in the document — otherwise a quote
 * attributed to citation N-1 gets falsely attached to citation N,
 * which produces a bogus "quote not found in cited opinion" risk on
 * the second citation.
 */
export function extractQuotesNearCitations(
  text: string,
  cites: ExtractedCitation[],
): { citationIndex: number; quoted: string }[] {
  const out: { citationIndex: number; quoted: string }[] = [];
  const sorted = [...cites]
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.startOffset - b.c.startOffset);

  let prevEnd = 0;
  for (const { c, i } of sorted) {
    const windowStart = Math.max(prevEnd, c.startOffset - 600);
    const window = text.slice(windowStart, c.startOffset);
    // Match the LAST quoted run before the citation. Multiline-friendly
    // so quotes that wrap a paragraph break still count.
    const matches = [...window.matchAll(/[“"]([^"”]{8,800})[”"]/g)];
    const last = matches.at(-1);
    if (last) out.push({ citationIndex: i, quoted: last[1].trim() });
    prevEnd = c.endOffset;
  }
  return out;
}

/**
 * Resolve short-form back-references ("Hickman, 329 U.S. at 510",
 * "Smith, 123 F.3d at 460") to a previously-extracted long-form
 * citation by case-name match. Returns one entry per short-form hit
 * pointing at the long-form citation's index — the verifier then
 * inherits the long-form's verdict for the short-form occurrence,
 * which surfaces every supporting use of an authority rather than
 * just the first appearance.
 */
export function resolveShortForms(
  text: string,
  cites: ExtractedCitation[],
): Array<{
  longFormIndex: number;
  rawText: string;
  startOffset: number;
  endOffset: number;
  pinpointPage?: string;
}> {
  const out: Array<{
    longFormIndex: number;
    rawText: string;
    startOffset: number;
    endOffset: number;
    pinpointPage?: string;
  }> = [];
  // Build a map from case-name fragment → index of long-form cite.
  // Use the first word of each case name (typically the plaintiff
  // surname) for matching, since short forms drop the rest.
  const nameToIndex = new Map<string, number>();
  for (let i = 0; i < cites.length; i++) {
    const c = cites[i];
    if (c.kind !== "case" || !c.caseName) continue;
    const firstWord = c.caseName.split(/[\s,]/)[0];
    if (firstWord && firstWord.length > 1 && !nameToIndex.has(firstWord)) {
      nameToIndex.set(firstWord, i);
    }
  }
  if (nameToIndex.size === 0) return out;

  for (const m of text.matchAll(SHORT_FORM_RE)) {
    const fragment = m[1].split(/\s/)[0]; // first word of the back-reference
    const idx = nameToIndex.get(fragment);
    if (idx == null) continue;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    // Don't re-claim the long-form span itself.
    const longForm = cites[idx];
    if (start >= longForm.startOffset && start < longForm.endOffset) continue;
    out.push({
      longFormIndex: idx,
      rawText: m[0].trim(),
      startOffset: start,
      endOffset: end,
      pinpointPage: m[4],
    });
  }
  return out;
}

export const ExtractedCitationSchema = z.object({
  kind: z.enum([
    "case",
    "statute",
    "state-statute",
    "rule",
    "constitution",
    "slip",
    "westlaw",
    "lexis",
  ]),
  rawText: z.string(),
  caseName: z.string().optional(),
  volume: z.string(),
  reporter: z.string(),
  page: z.string(),
  pinpointPage: z.string().optional(),
  year: z.number().optional(),
  court: z.string().optional(),
  contextSnippet: z.string(),
});
