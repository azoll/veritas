/**
 * Minimal CourtListener REST v4 client.
 * Docs: https://www.courtlistener.com/help/api/rest/
 *
 * We don't need a key for low-volume reads, but supplying one via
 * COURTLISTENER_TOKEN dramatically increases rate limits.
 *
 * Every public function in this module is cache-aside wrapped — the
 * raw `*Uncached` variants always hit CL, the public variants
 * consult Upstash Redis first. When no cache is provisioned the
 * adapter no-ops and every call passes through to CL.
 */

import { CACHE_VERSION, TTL, cacheGet, cacheIncr, cacheSet } from "./cache";

const BASE = "https://www.courtlistener.com/api/rest/v4";

function headers() {
  const h: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Veritas/0.1 (verification platform)",
  };
  const token = process.env.COURTLISTENER_TOKEN;
  if (token) h.Authorization = `Token ${token}`;
  return h;
}

/**
 * Global per-request throttle. CourtListener's per-IP/per-token
 * burst limit kicks in around 60 req/min — a 13-cite brief makes
 * ~40 CL requests (lookup + cluster + opinion per cite), so without
 * a spacer the back half of the verification batch gets throttled.
 * A 600ms spacer is enough to stay under ~100 req/min sustained
 * while adding ~25s of total wait to a 40-request batch — well
 * inside the 300s function timeout.
 *
 * Implementation: a single module-level promise chain everyone
 * awaits before firing their fetch.
 */
let throttleChain: Promise<void> = Promise.resolve();
// 400ms spacing = 150 req/min steady-state. CourtListener's
// authenticated per-token limit is approximately 5K/hr with a
// soft per-minute burst cap around 100-150. 400ms keeps us inside
// the burst cap while halving the throughput cost vs 600ms.
const CL_REQUEST_SPACING_MS = 400;
async function clThrottle(): Promise<void> {
  const myTurn = throttleChain.then(
    () => new Promise<void>((res) => setTimeout(res, CL_REQUEST_SPACING_MS)),
  );
  throttleChain = myTurn;
  return myTurn;
}

export type CLOpinionSearchHit = {
  id: number;
  caseName: string;
  citation: string[];
  court: string;
  dateFiled: string;
  absoluteUrl: string;
  clusterId: number;
  /** Snippet returned by CL search; may include the matched text. */
  snippet?: string;
};

/**
 * Look up the case at a specific reporter citation via CourtListener's
 * `/citation-lookup/` endpoint. This is fundamentally different from a
 * full-text search:
 *
 *   - Full-text search ranks by text relevance; the top hit for "329
 *     U.S. 495" can easily be a different opinion that happens to
 *     mention the citation in its body.
 *   - Citation lookup parses the cite and resolves it to the actual
 *     case published at that volume + reporter + page.
 *
 * For verification work we want the latter — exact match or nothing,
 * because "the case at this citation" is a specific factual claim.
 *
 * Status codes (per CourtListener):
 *   200  single match
 *   300  ambiguous (multiple matches; we take the first)
 *   404  no case at this citation — the fabrication signal
 *   429  rate limited (treat as inconclusive)
 */
export type CLLookupResult =
  | { ok: true; clusterId: number; caseName: string; absoluteUrl: string }
  | { ok: false; reason: "not_found" | "rate_limited" | "error" };

/**
 * Cache-aside wrapper. Cite addresses are immutable so `ok: true`
 * results cache forever; `not_found` caches for 24h (give CL time
 * to ingest new opinions); rate_limited and error are never cached.
 *
 * Built as a source chain so Stage 2/3 of the data-layer progression
 * (local DB mirror, then fully self-hosted federal corpus) slot in
 * at the front of `sources` without touching the verifier.
 */
export async function lookupCitation(
  volume: string,
  reporter: string,
  page: string,
): Promise<CLLookupResult> {
  const cacheKey = `${CACHE_VERSION}:cite:${volume}:${reporter.replace(/\s+/g, "")}:${page}`;
  const cached = await cacheGet<CLLookupResult>(cacheKey);
  if (cached) {
    await cacheIncr("metrics:cite:hit");
    return cached;
  }
  await cacheIncr("metrics:cite:miss");
  const fresh = await lookupCitationUncached(volume, reporter, page);
  if (fresh.ok) {
    await cacheSet(cacheKey, fresh, TTL.FOREVER);
  } else if (fresh.reason === "not_found") {
    // 7-day TTL on not_founds. AI hallucination patterns concentrate
    // around recent reporter series and the same plausible-but-fake
    // addresses get re-cited across many briefs — caching those 404s
    // longer means we don't re-hit CL once a day for the same known
    // fabrication. CL ingestion delay for new real opinions is
    // usually a few days, so 7 days still leaves margin for the rare
    // case where a "fabrication" later becomes a real cite.
    await cacheSet(cacheKey, fresh, TTL.SEVEN_DAYS);
  }
  return fresh;
}

async function lookupCitationUncached(
  volume: string,
  reporter: string,
  page: string,
): Promise<CLLookupResult> {
  // Reconstruct a canonical-looking citation string. The endpoint also
  // accepts volume/reporter/page as separate fields, but the text form
  // is more forgiving of reporter-name variants (e.g. "F.3d" vs
  // "F. 3d").
  const text = `${volume} ${reporter} ${page}`;
  const body = new URLSearchParams({ text }).toString();

  // Retry on transient rate limits — both transport-level 429 and the
  // item-level `status: 429` CL returns inside a 200 body. Vercel
  // serverless egress shares IPs with thousands of other apps, so CL's
  // per-IP throttle hits us harder than a local dev box. Longer windows
  // (~30s total) get us across most bursts.
  // Longer windows than fetchWithRetry uses below because
  // citation-lookup is the heaviest CL endpoint (parses the cite
  // server-side) and is the first thing every verification does, so
  // it sees the worst burst pressure. ~120s of total backoff covers
  // sustained per-minute throttle windows.
  const delays = [2000, 6000, 15000, 30000, 60000];
  const RETRIABLE = new Set([429, 502, 503, 504]);
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    let r: Response;
    try {
      await clThrottle();
      r = await fetch(`${BASE}/citation-lookup/`, {
        method: "POST",
        headers: {
          ...headers(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch {
      if (attempt === delays.length) return { ok: false, reason: "error" };
      await new Promise((res) => setTimeout(res, delays[attempt]));
      continue;
    }
    if (RETRIABLE.has(r.status)) {
      if (attempt === delays.length) {
        return { ok: false, reason: r.status === 429 ? "rate_limited" : "error" };
      }
      await new Promise((res) => setTimeout(res, delays[attempt]));
      continue;
    }
    if (!r.ok) return { ok: false, reason: "error" };
    const data = (await r.json()) as Array<{
      citation: string;
      status: number;
      clusters: Array<{ id: number; case_name: string; absolute_url: string }>;
    }>;
    const item = data[0];
    if (!item) return { ok: false, reason: "error" };
    if (item.status === 429) {
      if (attempt === delays.length) return { ok: false, reason: "rate_limited" };
      await new Promise((res) => setTimeout(res, delays[attempt]));
      continue;
    }
    if (item.status === 404) return { ok: false, reason: "not_found" };
    const c = item.clusters[0];
    if (!c) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      clusterId: c.id,
      caseName: c.case_name,
      absoluteUrl: `https://www.courtlistener.com${c.absolute_url}`,
    };
  }
  return { ok: false, reason: "rate_limited" };
}

export type CLOpinion = {
  id: number;
  clusterId: number;
  plainText: string;
  html: string;
};

/**
 * Fetch the full plain-text body of an opinion by its opinion id.
 * Used for pincite/quote verification.
 */
/**
 * Fetch with retry-on-transient backoff. CL rate-limits per-token
 * bursts AND occasionally returns 5xx under load, so a single bad
 * response was silently killing the treatment + pincite branches.
 * Returns null only on real failure; recoverable codes get retried.
 *
 * Retriable: 429, 502, 503, 504, and network errors. Anything else
 * (400, 404, 401, etc.) returns immediately — those are caller bugs
 * or "not found" answers, not transients.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } },
): Promise<Response | null> {
  // CL throttles aggressively on Vercel's shared egress IPs even with
  // a valid token. ~120s of total backoff lets a sustained per-minute
  // throttle window clear before we give up.
  const delays = [2000, 6000, 15000, 30000, 60000];
  const RETRIABLE = new Set([429, 502, 503, 504]);
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    let r: Response;
    try {
      await clThrottle();
      r = await fetch(url, init);
    } catch {
      if (attempt === delays.length) return null;
      await new Promise((res) => setTimeout(res, delays[attempt]));
      continue;
    }
    if (RETRIABLE.has(r.status)) {
      if (attempt === delays.length) return r; // give caller the bad response
      await new Promise((res) => setTimeout(res, delays[attempt]));
      continue;
    }
    return r;
  }
  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchOpinionText(opinionId: number): Promise<CLOpinion | null> {
  // Opinions are immutable once published — cache forever.
  const cacheKey = `${CACHE_VERSION}:opinion:${opinionId}`;
  const cached = await cacheGet<CLOpinion>(cacheKey);
  if (cached) {
    await cacheIncr("metrics:opinion:hit");
    return cached;
  }
  await cacheIncr("metrics:opinion:miss");
  const fresh = await fetchOpinionTextUncached(opinionId);
  if (fresh && fresh.plainText && fresh.plainText.length > 500) {
    await cacheSet(cacheKey, fresh, TTL.FOREVER);
  }
  return fresh;
}

async function fetchOpinionTextUncached(opinionId: number): Promise<CLOpinion | null> {
  const r = await fetchWithRetry(`${BASE}/opinions/${opinionId}/`, {
    headers: headers(),
    next: { revalidate: 86400 * 30 }, // opinions are immutable
  });
  if (!r || !r.ok) return null;
  const data = (await r.json()) as {
    id: number;
    cluster_id: number;
    plain_text?: string;
    html?: string;
    html_with_citations?: string;
  };
  // CL frequently stores the body in html_with_citations only (older
  // SCOTUS opinions especially). Fall back to a stripped version so the
  // pincite/proposition checks have substrate to work with.
  const html = data.html || data.html_with_citations || "";
  const plainText = (data.plain_text && data.plain_text.length > 50)
    ? data.plain_text
    : (html ? htmlToText(html) : "");
  return {
    id: data.id,
    clusterId: data.cluster_id,
    plainText,
    html,
  };
}

export type CLCluster = {
  id: number;
  caseName: string;
  dateFiled: string;
  /** Subsequent history / treatment indicators. */
  citationCount: number;
  precedentialStatus: string;
  citations: { volume: number; reporter: string; page: string; type: number }[];
  /** Opinions belonging to this cluster (majority, dissent, etc). */
  subOpinions: string[];
};

export async function fetchCluster(clusterId: number): Promise<CLCluster | null> {
  // Cluster metadata changes slowly — citationCount grows as new
  // cases cite this authority. 30-day TTL strikes the balance
  // between data freshness and cache effectiveness.
  const cacheKey = `${CACHE_VERSION}:cluster:${clusterId}`;
  const cached = await cacheGet<CLCluster>(cacheKey);
  if (cached) {
    await cacheIncr("metrics:cluster:hit");
    return cached;
  }
  await cacheIncr("metrics:cluster:miss");
  const fresh = await fetchClusterUncached(clusterId);
  if (fresh) {
    await cacheSet(cacheKey, fresh, TTL.THIRTY_DAYS);
  }
  return fresh;
}

async function fetchClusterUncached(clusterId: number): Promise<CLCluster | null> {
  const r = await fetchWithRetry(`${BASE}/clusters/${clusterId}/`, {
    headers: headers(),
    next: { revalidate: 86400 },
  });
  if (!r || !r.ok) return null;
  const d = (await r.json()) as {
    id: number;
    case_name: string;
    date_filed: string;
    citation_count: number;
    precedential_status: string;
    citations: { volume: number; reporter: string; page: string; type: number }[];
    sub_opinions: string[];
  };
  return {
    id: d.id,
    caseName: d.case_name,
    dateFiled: d.date_filed,
    citationCount: d.citation_count,
    precedentialStatus: d.precedential_status,
    citations: d.citations,
    subOpinions: d.sub_opinions,
  };
}
