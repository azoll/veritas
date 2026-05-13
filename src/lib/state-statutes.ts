/**
 * State statute verifier — Phase 1 (11 states).
 *
 * Sources we use, in priority order per state, all of which are
 * legally safe (statutes themselves are government edicts and are
 * uncopyrightable per Georgia v. Public.Resource.Org, 590 U.S. ___
 * (2020); we never touch Lexis/West annotations):
 *
 *   1. Official state legislature website (best when URL is stable)
 *   2. Justia State Codes (consistent across states, but URL paths
 *      vary by code so we encode them per-state)
 *
 * Each verifier returns a uniform LIIResult so the rest of the
 * pipeline doesn't care which source produced it. State coverage
 * extends with the same shape — adding a state is just a new entry
 * in STATE_HANDLERS plus a smoke test.
 *
 * Phase 1 covers: CA, CO, FL, GA, IL, MI, NJ, NY, OH, PA, TX.
 * Phase 2 will round out the remaining 39 states.
 */

import type { LIIResult } from "./lii";

const UA = "Veritas/0.1 (verification platform - andrew@veritaslaw.app)";

async function fetchExcerpt(url: string): Promise<LIIResult> {
  let r: Response;
  try {
    r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      next: { revalidate: 86400 * 7 },
    });
  } catch (e) {
    console.warn(`[state-statutes] fetch threw for ${url}:`, (e as Error).message);
    return { ok: false, reason: "error" };
  }
  if (r.status === 404) return { ok: false, reason: "not_found" };
  if (!r.ok) {
    console.warn(`[state-statutes] non-OK ${r.status} for ${url}`);
    return { ok: false, reason: "error" };
  }
  const html = await r.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const titleMatch = /<title>([^<]+)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].split("|")[0].split("·")[0].trim() : "";
  // Some legislative sites return a 200 with a "Section not found"
  // landing page — sniff for the common phrases so we don't falsely
  // verify nonexistent sections.
  const looksMissing = /no\s+(?:results|matches)|not\s+found|invalid\s+section|page\s+not\s+available|section\s+does\s+not\s+exist/i.test(
    text.slice(0, 2000),
  );
  if (looksMissing) return { ok: false, reason: "not_found" };
  return { ok: true, sourceUrl: url, excerpt: text.slice(0, 40_000), title };
}

/**
 * Try a sequence of candidate URLs and return the first that
 * resolves. Lets us put the official state-legislature source first
 * and fall back to Justia (or another mirror) if the official one is
 * down or 404s.
 */
async function tryUrls(urls: string[]): Promise<LIIResult> {
  let lastReason: "not_found" | "error" = "not_found";
  for (const url of urls) {
    const r = await fetchExcerpt(url);
    if (r.ok) return r;
    if (r.reason === "error") lastReason = "error";
  }
  return { ok: false, reason: lastReason };
}

type Handler = (section: string) => string[];

/**
 * Per-state URL builders. `section` is whatever appears after the §
 * (e.g. "187", "1983(a)", "90.502"). We strip subsection parens for
 * the URL because all sources serve the whole section at one address.
 */
const STATE_HANDLERS: Record<string, Record<string, Handler>> = {
  // ── CALIFORNIA ────────────────────────────────────────────────
  // Official: leginfo.legislature.ca.gov serves codes by ?sectionNum&lawCode
  // Fallback: justia /codes/california/code-{slug}/section-{n}/
  california: {
    penal: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=PEN`,
      `https://law.justia.com/codes/california/code-pen/section-${baseSection(s)}/`,
    ],
    civil: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=CIV`,
      `https://law.justia.com/codes/california/code-civ/section-${baseSection(s)}/`,
    ],
    "civil-procedure": (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=CCP`,
      `https://law.justia.com/codes/california/code-ccp/section-${baseSection(s)}/`,
    ],
    evidence: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=EVID`,
      `https://law.justia.com/codes/california/code-evid/section-${baseSection(s)}/`,
    ],
    business: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=BPC`,
    ],
    "health-safety": (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=HSC`,
    ],
    labor: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=LAB`,
    ],
    family: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=FAM`,
    ],
    probate: (s) => [
      `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${baseSection(s)}.&lawCode=PROB`,
    ],
  },

  // ── COLORADO ──────────────────────────────────────────────────
  // CRS sections are dotted: "18-3-102" → title 18, article 3, sec 102.
  // Justia has a clean URL: /codes/colorado/title-18/article-3/section-18-3-102/
  // We accept incoming section either as "18-3-102" or just "18-3-102.5".
  colorado: {
    revised: (s) => {
      const parts = s.split(/[-.]/);
      const title = parts[0];
      const article = parts[1] || "1";
      return [
        `https://law.justia.com/codes/colorado/title-${title}/article-${article}/section-${s}/`,
        `https://leg.colorado.gov/sites/default/files/images/olls/crs2024-title-${String(title).padStart(2, "0")}.pdf`, // last resort; PDFs aren't great for text extraction but the URL existing is at least a positive signal
      ];
    },
  },

  // ── FLORIDA ───────────────────────────────────────────────────
  // Fla. Stat. § 90.502 → chapter 90, section 502
  florida: {
    statutes: (s) => {
      const chapter = s.split(".")[0];
      return [
        `http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&Search_String=&URL=0000-0099/${chapter.padStart(4, "0")}/Sections/${chapter.padStart(4, "0")}${s.split(".")[1] ? "." + s.split(".")[1] : ""}.html`,
        `https://law.justia.com/codes/florida/title-vii/chapter-${chapter}/section-${s}/`,
      ];
    },
  },

  // ── GEORGIA ───────────────────────────────────────────────────
  // O.C.G.A. § 16-5-1 → title 16, chapter 5, section 1
  georgia: {
    statutes: (s) => [
      `https://law.justia.com/codes/georgia/title-${s.split("-")[0]}/section-${s}/`,
    ],
  },

  // ── ILLINOIS ──────────────────────────────────────────────────
  // 720 ILCS 5/9-1 — chapter 720, act 5, section 9-1
  illinois: {
    statutes: (s) => {
      const parts = s.split("/");
      const ch = parts[0];
      return [
        `https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=${ch}&ChapterID=0`,
        `https://law.justia.com/codes/illinois/chapter-${ch}/`,
      ];
    },
  },

  // ── MICHIGAN ──────────────────────────────────────────────────
  // MCL 750.316 → http://www.legislature.mi.gov/(S(...))/mileg.aspx?page=getObject&objectName=mcl-750-316
  michigan: {
    statutes: (s) => [
      `http://www.legislature.mi.gov/mileg.aspx?page=getObject&objectName=mcl-${s.replace(/\./g, "-")}`,
      `https://law.justia.com/codes/michigan/chapter-${s.split(".")[0]}/section-${s}/`,
    ],
  },

  // ── NEW JERSEY ────────────────────────────────────────────────
  // N.J.S.A. 2C:11-3 → title 2C, chapter 11, section 3
  "new-jersey": {
    statutes: (s) => [
      `https://law.justia.com/codes/new-jersey/title-${s.split(":")[0]}/section-${s.replace(/:/g, "-")}/`,
    ],
  },

  // ── NEW YORK ──────────────────────────────────────────────────
  "new-york": {
    penal: (s) => [
      `https://www.nysenate.gov/legislation/laws/PEN/${s}`,
      `https://law.justia.com/codes/new-york/pen/part-2/title-h/article-125/${s}/`,
    ],
    civil: (s) => [
      `https://www.nysenate.gov/legislation/laws/CVP/${s}`,
    ],
    general: (s) => [
      `https://www.nysenate.gov/legislation/laws/GBS/${s}`,
    ],
  },

  // ── OHIO ──────────────────────────────────────────────────────
  // R.C. 2903.01 → http://codes.ohio.gov/orc/2903.01
  ohio: {
    statutes: (s) => [
      `https://codes.ohio.gov/ohio-revised-code/section-${s}`,
      `https://law.justia.com/codes/ohio/title-29/chapter-${s.split(".")[0]}/section-${s}/`,
    ],
  },

  // ── PENNSYLVANIA ──────────────────────────────────────────────
  // 18 Pa. C.S. § 2502
  pennsylvania: {
    statutes: (s) => [
      `https://law.justia.com/codes/pennsylvania/title-18/section-${s}/`,
    ],
  },

  // ── TEXAS ─────────────────────────────────────────────────────
  // Tex. Penal Code § 19.02 → https://statutes.capitol.texas.gov/Docs/PE/htm/PE.19.htm
  texas: {
    penal: (s) => [
      `https://statutes.capitol.texas.gov/Docs/PE/htm/PE.${s.split(".")[0]}.htm`,
    ],
    civil: (s) => [
      `https://statutes.capitol.texas.gov/Docs/CP/htm/CP.${s.split(".")[0]}.htm`,
    ],
    business: (s) => [
      `https://statutes.capitol.texas.gov/Docs/BC/htm/BC.${s.split(".")[0]}.htm`,
    ],
    family: (s) => [
      `https://statutes.capitol.texas.gov/Docs/FA/htm/FA.${s.split(".")[0]}.htm`,
    ],
  },
};

function baseSection(s: string): string {
  return s.replace(/[()].*$/, "").replace(/\s+/g, "");
}

/**
 * Resolve the extracted `code` string (e.g. "Cal. Penal Code",
 * "Colo. Rev. Stat.", "Fla. Stat.") to a (state, code-family) pair
 * we can build URLs for. Returns null if the state isn't yet covered
 * in Phase 1.
 */
function resolveCodeFamily(
  code: string,
): { state: keyof typeof STATE_HANDLERS; family: string } | null {
  const c = code.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");

  // California
  if (/^cal\b/.test(c)) {
    if (/penal/.test(c)) return { state: "california", family: "penal" };
    if (/civil\s+proc/.test(c) || /code\s+civ\s+proc/.test(c) || /ccp/.test(c))
      return { state: "california", family: "civil-procedure" };
    if (/civil/.test(c) || /civ\s+code/.test(c))
      return { state: "california", family: "civil" };
    if (/evidence|evid/.test(c)) return { state: "california", family: "evidence" };
    if (/business|bus/.test(c)) return { state: "california", family: "business" };
    if (/health|safety/.test(c)) return { state: "california", family: "health-safety" };
    if (/labor|lab/.test(c)) return { state: "california", family: "labor" };
    if (/family|fam/.test(c)) return { state: "california", family: "family" };
    if (/probate|prob/.test(c)) return { state: "california", family: "probate" };
  }
  // Colorado: "Colo. Rev. Stat." / "C.R.S."
  if (/^colo\b/.test(c) || /\bcrs\b/.test(c))
    return { state: "colorado", family: "revised" };
  // Florida
  if (/^fla\b/.test(c)) return { state: "florida", family: "statutes" };
  // Georgia: "O.C.G.A." / "Ga. Code"
  if (/^ga\b/.test(c) || /^ocga\b/.test(c))
    return { state: "georgia", family: "statutes" };
  // Illinois: "ILCS"
  if (/ilcs/.test(c) || /^ill\b/.test(c))
    return { state: "illinois", family: "statutes" };
  // Michigan: "MCL" / "Mich. Comp. Laws"
  if (/^mich\b/.test(c) || /\bmcl\b/.test(c))
    return { state: "michigan", family: "statutes" };
  // New Jersey: "N.J.S.A." / "N.J. Stat."
  if (/^nj\b/.test(c) || /njsa/.test(c))
    return { state: "new-jersey", family: "statutes" };
  // New York
  if (/^ny\b/.test(c)) {
    if (/penal/.test(c)) return { state: "new-york", family: "penal" };
    if (/cpl\b|civil\s+pract/.test(c)) return { state: "new-york", family: "civil" };
    return { state: "new-york", family: "general" };
  }
  // Ohio: "Ohio Rev. Code" / "R.C."
  if (/^ohio\b/.test(c)) return { state: "ohio", family: "statutes" };
  // Pennsylvania: "Pa. C.S." / "Pa. Cons. Stat."
  if (/^pa\b/.test(c)) return { state: "pennsylvania", family: "statutes" };
  // Texas
  if (/^tex\b/.test(c)) {
    if (/penal/.test(c)) return { state: "texas", family: "penal" };
    if (/civil\s+pract|civ\s+prac/.test(c))
      return { state: "texas", family: "civil" };
    if (/business|bus/.test(c)) return { state: "texas", family: "business" };
    if (/family|fam/.test(c)) return { state: "texas", family: "family" };
  }
  return null;
}

/** True iff Phase 1 covers the extracted state code. */
export function stateStatuteCovered(code: string): boolean {
  return resolveCodeFamily(code) !== null;
}

export async function lookupStateStatute(
  code: string,
  section: string,
): Promise<LIIResult> {
  const resolved = resolveCodeFamily(code);
  if (!resolved) return { ok: false, reason: "not_found" };
  const handler = STATE_HANDLERS[resolved.state][resolved.family];
  if (!handler) return { ok: false, reason: "not_found" };
  const urls = handler(section);
  return tryUrls(urls);
}
