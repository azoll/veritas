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
  if (!r.ok) {
    return { ok: false, reason: r.status === 429 ? "rate_limited" : "error" };
  }
  const data = (await r.json()) as Array<{
    citation: string;
    status: number;
    clusters: Array<{ id: number; case_name: string; absolute_url: string }>;
  }>;
  const item = data[0];
  if (!item) return { ok: false, reason: "error" };
  if (item.status === 404) return { ok: false, reason: "not_found" };
  if (item.status === 429) return { ok: false, reason: "rate_limited" };
  const c = item.clusters[0];
  if (!c) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    clusterId: c.id,
    caseName: c.case_name,
    absoluteUrl: `https://www.courtlistener.com${c.absolute_url}`,
  };
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
export async function fetchOpinionText(opinionId: number): Promise<CLOpinion | null> {
  const r = await fetch(`${BASE}/opinions/${opinionId}/`, {
    headers: headers(),
    next: { revalidate: 86400 * 30 }, // opinions are immutable
  });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    id: number;
    cluster_id: number;
    plain_text?: string;
    html?: string;
    html_with_citations?: string;
  };
  return {
    id: data.id,
    clusterId: data.cluster_id,
    plainText: data.plain_text ?? "",
    html: data.html ?? data.html_with_citations ?? "",
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
  const r = await fetch(`${BASE}/clusters/${clusterId}/`, {
    headers: headers(),
    next: { revalidate: 86400 },
  });
  if (!r.ok) return null;
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
