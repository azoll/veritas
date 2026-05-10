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
 * Look up an opinion by free-text citation, e.g. "410 U.S. 113".
 * Returns the top match, or null if nothing scored high enough.
 */
export async function searchByCitation(
  query: string,
): Promise<CLOpinionSearchHit | null> {
  const url = new URL(`${BASE}/search/`);
  url.searchParams.set("type", "o");
  url.searchParams.set("q", query);
  url.searchParams.set("order_by", "score desc");

  const r = await fetch(url, { headers: headers(), next: { revalidate: 86400 } });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    results?: Array<{
      id: number;
      caseName: string;
      citation?: string[];
      court: string;
      dateFiled: string;
      absolute_url: string;
      cluster_id: number;
      snippet?: string;
    }>;
  };
  const hit = data.results?.[0];
  if (!hit) return null;
  return {
    id: hit.id,
    caseName: hit.caseName,
    citation: hit.citation ?? [],
    court: hit.court,
    dateFiled: hit.dateFiled,
    absoluteUrl: `https://www.courtlistener.com${hit.absolute_url}`,
    clusterId: hit.cluster_id,
    snippet: hit.snippet,
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
