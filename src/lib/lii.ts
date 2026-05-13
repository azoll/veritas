/**
 * Cornell Legal Information Institute (LII) verifier.
 *
 * LII hosts the U.S. Code, the Code of Federal Regulations, and the
 * Federal Rules at stable, predictable URLs:
 *
 *   - U.S.C.:   https://www.law.cornell.edu/uscode/text/{title}/{section}
 *   - C.F.R.:   https://www.law.cornell.edu/cfr/text/{title}/{section}
 *   - FRCP:     https://www.law.cornell.edu/rules/frcp/rule_{n}
 *   - FRE:      https://www.law.cornell.edu/rules/fre/rule_{n}
 *   - FRAP:     https://www.law.cornell.edu/rules/frap/rule_{n}
 *   - FRCrP:    https://www.law.cornell.edu/rules/frcrmp/rule_{n}
 *   - FRBP:     https://www.law.cornell.edu/rules/frbp/rule_{n}
 *
 * We verify existence with a HEAD request and pull a small prose
 * excerpt for proposition-support evaluation. LII is free for any
 * lawful use, has no rate limits worth worrying about for our
 * volume, and is the closest thing to a "primary source" canonical
 * URL for federal statutory and rules text.
 */

import { CACHE_VERSION, TTL, cacheGet, cacheIncr, cacheSet } from "./cache";

// Pure-ASCII UA — Vercel's fetch rejects non-ASCII header values
// (the em-dash that used to live here was silently failing every
// statute and rule lookup).
const UA = "Veritas/0.1 (verification platform - andrew@veritaslaw.app)";

export type LIIResult =
  | { ok: true; sourceUrl: string; excerpt: string; title: string }
  | { ok: false; reason: "not_found" | "error" };

async function fetchExcerpt(url: string): Promise<LIIResult> {
  let r: Response;
  try {
    r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      next: { revalidate: 86400 * 7 }, // statutes change rarely
    });
  } catch (e) {
    console.warn(`[lii] fetch threw for ${url}:`, (e as Error).message);
    return { ok: false, reason: "error" };
  }
  if (r.status === 404) return { ok: false, reason: "not_found" };
  if (!r.ok) {
    console.warn(`[lii] non-OK ${r.status} for ${url}`);
    return { ok: false, reason: "error" };
  }
  const html = await r.text();
  // Strip everything to text, capture a leading excerpt sized for AI
  // proposition analysis. LII pages are mostly clean prose inside
  // <div class="tabContent" id="content"> blocks; we don't need
  // perfect HTML parsing here.
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
  // Page titles on LII follow "26 U.S. Code § 1 - Tax imposed | LII /
  // Legal Information Institute" — peel the title out for display.
  const titleMatch = /<title>([^<]+)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].split("|")[0].trim() : "";
  // Cap excerpt at 40k chars same as opinion text for AI cost predictability.
  const excerpt = text.slice(0, 40_000);
  return { ok: true, sourceUrl: url, excerpt, title };
}

/**
 * Cache-aside wrapper for fetchExcerpt. Statute and rule pages
 * change very slowly (annual amendments at most), so we cache
 * successes for 7 days and not_founds for 24 hours. Errors are
 * never cached.
 */
async function cachedFetchExcerpt(
  scope: string,
  cacheId: string,
  url: string,
): Promise<LIIResult> {
  const cacheKey = `${CACHE_VERSION}:lii:${scope}:${cacheId}`;
  const cached = await cacheGet<LIIResult>(cacheKey);
  if (cached) {
    await cacheIncr(`metrics:lii-${scope}:hit`);
    return cached;
  }
  await cacheIncr(`metrics:lii-${scope}:miss`);
  const fresh = await fetchExcerpt(url);
  if (fresh.ok) {
    await cacheSet(cacheKey, fresh, TTL.SEVEN_DAYS);
  } else if (fresh.reason === "not_found") {
    await cacheSet(cacheKey, fresh, TTL.ONE_DAY);
  }
  return fresh;
}

/** Federal statute lookup: title + section → LII U.S.C. URL. */
export async function lookupUSC(
  title: string,
  section: string,
): Promise<LIIResult> {
  // Section identifiers can include subsection in parens — keep only
  // the section number for URL building; subsections live within the
  // same page.
  const baseSection = section.replace(/[()].*$/, "").replace(/\s+/g, "");
  const url = `https://www.law.cornell.edu/uscode/text/${title}/${baseSection}`;
  return cachedFetchExcerpt("usc", `${title}-${baseSection}`, url);
}

export async function lookupCFR(
  title: string,
  section: string,
): Promise<LIIResult> {
  const baseSection = section.replace(/[()].*$/, "").replace(/\s+/g, "");
  const url = `https://www.law.cornell.edu/cfr/text/${title}/${baseSection}`;
  return cachedFetchExcerpt("cfr", `${title}-${baseSection}`, url);
}

/**
 * Federal Rule lookup. ruleSet is the captured group from the regex
 * ("Civ", "Crim", "Evid", "App", "Bankr"). number is e.g. "26" or
 * "26(b)(1)" — we strip subsections for the URL path.
 */
export async function lookupFedRule(
  ruleSet: string,
  number: string,
): Promise<LIIResult> {
  const set = ruleSet.toLowerCase();
  const slug =
    set === "civ"
      ? "frcp"
      : set === "crim"
        ? "frcrmp"
        : set === "evid"
          ? "fre"
          : set === "app"
            ? "frap"
            : set === "bankr"
              ? "frbp"
              : null;
  if (!slug) return { ok: false, reason: "error" };
  const baseNumber = number.replace(/[()].*$/, "").replace(/\s+/g, "");
  const url = `https://www.law.cornell.edu/rules/${slug}/rule_${baseNumber}`;
  return cachedFetchExcerpt("rule", `${slug}-${baseNumber}`, url);
}
