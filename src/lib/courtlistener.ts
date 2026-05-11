/**
 * Minimal CourtListener REST v4 client.
 * Docs: https://www.courtlistener.com/help/api/rest/
 *
 * We don't need a key for low-volume reads, but supplying one via
 * COURTLISTENER_TOKEN dramatically increases rate limits.
 */

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

export async function lookupCitation(
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
  // item-level `status: 429` CL returns inside a 200 body. CL throttles
  // per-token bursts; a short pause usually clears it, and turning
  // transient rate limits into "unknown" verdicts erodes signal.
  const delays = [400, 1200, 3000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    let r: Response;
    try {
      r = await fetch(`${BASE}/citation-lookup/`, {
        method: "POST",
        headers: {
          ...headers(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch {
      return { ok: false, reason: "error" };
    }
    if (r.status === 429) {
      if (attempt === delays.length) return { ok: false, reason: "rate_limited" };
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
 * Fetch with retry-on-429 backoff. CL rate-limits per-token bursts on
 * the cluster/opinion endpoints just like /citation-lookup/, so a single
 * transient 429 was silently killing the treatment + pincite branches.
 * Returns null only on real failure, never on a recoverable rate limit.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } },
): Promise<Response | null> {
  const delays = [400, 1200, 3000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    let r: Response;
    try {
      r = await fetch(url, init);
    } catch {
      return null;
    }
    if (r.status === 429) {
      if (attempt === delays.length) return r; // give caller the 429 to handle
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
