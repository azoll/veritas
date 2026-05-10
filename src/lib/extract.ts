/**
 * Citation extraction — two passes.
 *
 * Pass 1 (deterministic): regex scan for reporter-style citations like
 *   "410 U.S. 113", "123 F.3d 456", "550 U.S. 544 (2007)".
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

const REPORTER =
  "(?:U\\.?\\s?S\\.?|S\\.?\\s?Ct\\.?|L\\.?\\s?Ed\\.?(?:\\.?\\s?2d)?|F\\.?\\s?(?:2d|3d|4th|App'x|Supp\\.?(?:\\s?2d|\\s?3d)?)|F\\.?|A\\.?(?:2d|3d)?|N\\.?E\\.?(?:2d|3d)?|N\\.?W\\.?(?:2d|3d)?|S\\.?E\\.?(?:2d|3d)?|S\\.?W\\.?(?:2d|3d)?|P\\.?(?:2d|3d)?|Cal\\.?(?:Rptr\\.?(?:\\s?2d|\\s?3d)?|App\\.?(?:\\s?2d|\\s?3d|\\s?4th)?)?|Wn\\.?(?:2d)?|Mass\\.?|Tex\\.?|Pa\\.?|Ill\\.?(?:2d)?|N\\.?Y\\.?(?:2d|3d)?|So\\.?(?:2d|3d)?)";

const CITE_RE = new RegExp(
  // optional case name — capital-initialed words then " v. " then capital words, ending before the volume number
  `((?:[A-Z][A-Za-z'.&,\\-]+(?:\\s+[A-Z][A-Za-z'.&,\\-]+){0,4})\\s+v\\.\\s+(?:[A-Z][A-Za-z'.&,\\-]+(?:\\s+[A-Z][A-Za-z'.&,\\-]+){0,4}))?` +
    `\\s*,?\\s*` +
    // volume reporter page
    `(\\d{1,4})\\s+(${REPORTER})\\s+(\\d{1,5})` +
    // optional pinpoint
    `(?:,\\s*(\\d{1,5}))?` +
    // optional parenthetical court / year
    `(?:\\s*\\(([^)]{1,80})\\))?`,
  "g",
);

export type ExtractedCitation = {
  rawText: string;
  caseName?: string;
  volume: string;
  reporter: string;
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

  for (const match of text.matchAll(CITE_RE)) {
    const [whole, caseName, volume, reporter, page, pin, paren] = match;
    const start = match.index ?? 0;
    const end = start + whole.length;

    let year: number | undefined;
    let court: string | undefined;
    if (paren) {
      const yearMatch = paren.match(/\b(1[89]\d{2}|20\d{2})\b/);
      if (yearMatch) year = Number(yearMatch[1]);
      court = paren.replace(/\b(1[89]\d{2}|20\d{2})\b/, "").trim() || undefined;
    }

    const key = `${volume}::${reporter}::${page}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      rawText: whole.trim(),
      caseName: caseName?.trim(),
      volume,
      reporter: reporter.replace(/\s+/g, " ").trim(),
      page,
      pinpointPage: pin,
      parenthetical: paren,
      court,
      year,
      startOffset: start,
      endOffset: end,
      contextSnippet: snippet(text, start, end),
    });
  }

  return out;
}

/**
 * Extract direct quotations attributed to a citation. Heuristic: a quoted
 * passage immediately preceding (within ~250 chars) the citation marker.
 */
export function extractQuotesNearCitations(
  text: string,
  cites: ExtractedCitation[],
): { citationIndex: number; quoted: string }[] {
  const out: { citationIndex: number; quoted: string }[] = [];
  for (let i = 0; i < cites.length; i++) {
    const c = cites[i];
    const window = text.slice(Math.max(0, c.startOffset - 600), c.startOffset);
    // Match the LAST quoted run before the citation
    const matches = [...window.matchAll(/[“"]([^"”]{8,400})[”"]/g)];
    const last = matches.at(-1);
    if (last) out.push({ citationIndex: i, quoted: last[1].trim() });
  }
  return out;
}

export const ExtractedCitationSchema = z.object({
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
