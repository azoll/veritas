import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Verification Certificate — the institutional artifact of a Veritas
 * review. It is intentionally restrained: a single page that fits a
 * court-filing aesthetic, declares what was reviewed, summarizes the
 * findings, and binds the result to the original document via a
 * SHA-256 content hash and an unguessable certificate token.
 *
 * The certificate is meant to feel like an audit attestation, not a
 * marketing artifact. Tone matches the rest of the product: hedged,
 * procedural, and clear that the reviewing attorney is the reviewer of
 * record. Veritas's role is to surface candidates for review.
 */

export type CertificateData = {
  document: typeof schema.documents.$inferSelect;
  citations: (typeof schema.citations.$inferSelect)[];
  verifications: (typeof schema.verifications.$inferSelect)[];
  token: string;
  riskScore: number | null;
};

/** Ensure the document has a stable public certificate token. */
export async function ensureCertificateToken(
  documentId: string,
): Promise<string> {
  const [doc] = await db
    .select({ token: schema.documents.certificateToken })
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId));
  if (doc?.token) return doc.token;
  const token = randomBytes(20).toString("hex");
  await db
    .update(schema.documents)
    .set({ certificateToken: token })
    .where(eq(schema.documents.id, documentId));
  return token;
}

/** Load all data needed to render the certificate. */
export async function loadCertificateData(
  documentId: string,
): Promise<CertificateData | null> {
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId));
  if (!doc) return null;

  const cites = await db
    .select()
    .from(schema.citations)
    .where(eq(schema.citations.documentId, documentId))
    .orderBy(asc(schema.citations.startOffset));

  const verifs = cites.length
    ? await db
        .select()
        .from(schema.verifications)
        .where(
          inArray(
            schema.verifications.citationId,
            cites.map((c) => c.id),
          ),
        )
    : [];

  const token = await ensureCertificateToken(documentId);
  const riskScore = doc.confidenceScore != null ? 100 - doc.confidenceScore : null;
  return { document: doc, citations: cites, verifications: verifs, token, riskScore };
}

/** Lookup by public certificate token (for /c/<token>). */
export async function loadCertificateByToken(
  token: string,
): Promise<CertificateData | null> {
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.certificateToken, token));
  if (!doc) return null;
  return loadCertificateData(doc.id);
}

/**
 * Render the certificate as standalone HTML. Designed to print cleanly
 * to PDF from the browser. No external assets — fonts are system stacks
 * with serif fallback so the certificate renders identically on every
 * machine, including air-gapped review terminals.
 */
export function renderCertificateHtml(
  data: CertificateData,
  opts: { publicUrl?: string } = {},
): string {
  const { document: doc, citations, verifications, token, riskScore } = data;

  const verifsByCit = new Map<string, typeof verifications>();
  for (const v of verifications) {
    const arr = verifsByCit.get(v.citationId) ?? [];
    arr.push(v);
    verifsByCit.set(v.citationId, arr);
  }

  const issued = doc.updatedAt ? new Date(doc.updatedAt) : new Date();
  const issuedStr = issued.toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const verifyUrl =
    (opts.publicUrl ?? "https://veritas-rust-psi.vercel.app") +
    "/c/" +
    token;

  // Each citation row: status + label + reasoning.
  const rows = citations
    .map((c) => {
      const checks = verifsByCit.get(c.id) ?? [];
      const status =
        c.verdict === "verified"
          ? "Confirmed"
          : c.verdict === "warning"
            ? "Review recommended"
            : c.verdict === "risk"
              ? "Not located in reporter"
              : "Pending";
      const checkLines = checks
        .map(
          (v) =>
            `<div class="ck"><span class="ck-kind">${esc(v.kind)}</span><span class="ck-detail">${esc(v.detail ?? "")}</span></div>`,
        )
        .join("");
      return `<tr>
        <td class="cite">${esc(c.caseName ?? "")}<br><span class="norm">${esc(c.normalized ?? c.rawText)}</span></td>
        <td class="status status--${c.verdict}">${esc(status)}</td>
        <td class="checks">${checkLines}</td>
      </tr>`;
    })
    .join("");

  const verifiedCount = citations.filter((c) => c.verdict === "verified").length;
  const warnCount = citations.filter((c) => c.verdict === "warning").length;
  const riskCount = citations.filter((c) => c.verdict === "risk").length;

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8" />
<title>Veritas Verification Certificate — ${esc(doc.title)}</title>
<style>
  :root {
    --ink: #0B0D10;
    --paper: #F4F2EE;
    --muted: #5B6470;
    --muted-2: #8A929B;
    --hair: rgba(11,13,16,0.10);
    --gold: #B88230;
    --verified: #2E7D5A;
    --amber: #B88230;
    --critical: #8E2B2B;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }
  body {
    font-family: 'Instrument Serif', 'IBM Plex Serif', Georgia, serif;
    font-size: 15px;
    line-height: 1.5;
    max-width: 880px;
    margin: 40px auto;
    padding: 0 56px 80px;
    background: #fff;
    border: 1px solid var(--hair);
  }
  .seal {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 32px 0 24px;
    border-bottom: 2px solid var(--ink);
  }
  .seal-mark { display: flex; align-items: center; gap: 14px; }
  .seal svg { width: 28px; height: auto; }
  .wordmark { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-weight: 500; font-size: 13px; letter-spacing: 0.32em; }
  .stamp {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted);
    text-align: right;
    line-height: 1.6;
  }
  h1 {
    margin: 32px 0 8px;
    font-weight: 400;
    font-size: 40px;
    letter-spacing: -0.02em;
    line-height: 1.05;
  }
  .subtitle { color: var(--muted); font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 14px; }
  .meta {
    margin-top: 32px;
    padding: 18px 22px;
    border: 1px solid var(--hair);
    background: #FAF8F4;
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 8px 18px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.5;
    letter-spacing: 0.04em;
  }
  .meta dt { color: var(--muted); margin: 0; }
  .meta dd { margin: 0; color: var(--ink); word-break: break-all; }
  .meta .hash { font-size: 10px; }
  .summary {
    margin-top: 32px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1px solid var(--hair);
  }
  .summary > div { padding: 16px 18px; border-right: 1px solid var(--hair); }
  .summary > div:last-child { border-right: 0; }
  .summary .lbl { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .summary .val { margin-top: 6px; font-size: 28px; }
  .summary .val--critical { color: var(--critical); }
  .summary .val--amber { color: var(--amber); }
  .summary .val--verified { color: var(--verified); }
  h2 {
    margin: 40px 0 12px;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -0.005em;
  }
  table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 13px; }
  thead th {
    text-align: left;
    padding: 10px 12px;
    background: #FAF8F4;
    border-bottom: 1px solid var(--hair);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
    font-weight: 500;
  }
  tbody td { padding: 14px 12px; border-bottom: 1px solid var(--hair); vertical-align: top; }
  .cite { font-family: 'Instrument Serif', Georgia, serif; font-size: 14px; }
  .cite .norm { display: inline-block; margin-top: 2px; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; color: var(--muted); }
  .status { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
  .status--verified { color: var(--verified); }
  .status--warning  { color: var(--amber); }
  .status--risk     { color: var(--critical); }
  .status--unknown  { color: var(--muted); }
  .checks { font-size: 12px; color: var(--muted); }
  .ck { display: grid; grid-template-columns: 96px 1fr; gap: 8px; padding: 3px 0; }
  .ck-kind { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-2); }
  .ck-detail { color: var(--ink); line-height: 1.45; }
  .disclaimer {
    margin-top: 40px;
    padding: 18px 22px;
    border-left: 2px solid var(--gold);
    background: #FAF8F4;
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted);
  }
  .disclaimer b { color: var(--ink); font-weight: 500; }
  .foot {
    margin-top: 56px;
    padding-top: 20px;
    border-top: 1px solid var(--hair);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
  @media print {
    body { margin: 0; border: 0; max-width: none; }
    .no-print { display: none; }
  }
</style>
</head><body>

<header class="seal">
  <div class="seal-mark">
    <svg viewBox="0 0 200 220" aria-hidden="true">
      <path fill="currentColor" d="M 4 8 L 50 8 L 50 22 L 38 22 L 100 188 L 162 22 L 150 22 L 150 8 L 196 8 L 196 22 L 184 22 L 115 210 L 85 210 L 16 22 L 4 22 Z"/>
      <path fill="#B88230" d="M 100 38 L 118 88 L 100 138 L 82 88 Z"/>
    </svg>
    <span class="wordmark">VERITAS</span>
  </div>
  <div class="stamp">
    Verification Certificate<br/>
    Issued ${esc(issuedStr)}
  </div>
</header>

<h1>${esc(doc.title)}</h1>
<div class="subtitle">${esc(doc.filename)}</div>

<dl class="meta">
  <dt>Document hash</dt>
  <dd class="hash">${esc(doc.contentHash ?? "—")} (SHA-256)</dd>
  <dt>Citations reviewed</dt>
  <dd>${doc.citationCount}</dd>
  <dt>Risk score</dt>
  <dd>${riskScore != null ? riskScore + " / 100 (lower = safer)" : "—"}</dd>
  <dt>Certificate ID</dt>
  <dd>${esc(token)}</dd>
  <dt>Verify online</dt>
  <dd>${esc(verifyUrl)}</dd>
</dl>

<div class="summary">
  <div><div class="lbl">Confirmed</div><div class="val val--verified">${verifiedCount}</div></div>
  <div><div class="lbl">Review</div><div class="val val--amber">${warnCount}</div></div>
  <div><div class="lbl">Not located</div><div class="val val--critical">${riskCount}</div></div>
  <div><div class="lbl">Total</div><div class="val">${doc.citationCount}</div></div>
</div>

<h2>Citation findings</h2>
<table>
  <thead>
    <tr>
      <th>Authority</th>
      <th>Status</th>
      <th>Reviewer notes</th>
    </tr>
  </thead>
  <tbody>
    ${rows || `<tr><td colspan="3" style="padding:24px;color:var(--muted);font-style:italic;">No citations were detected in this filing.</td></tr>`}
  </tbody>
</table>

<div class="disclaimer">
  <b>Reviewer of record.</b> Veritas surfaces candidates for attorney
  review. The findings above are not legal conclusions. The decision to
  rely on any authority — and responsibility for every citation in the
  filing — remains with the filing attorney.
</div>

<div class="foot">
  <span>© 2026 Veritas, Inc.</span>
  <span>Trust, verified.</span>
</div>

</body></html>`;
}

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
