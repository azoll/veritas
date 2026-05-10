import { and, asc, eq, inArray } from "drizzle-orm";
import { requireScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/documents/:id/report — printable HTML verification report.
 * Browsers can save → PDF; in Phase 1 we'll move this to a server-rendered
 * Vercel-OG style PDF, but HTML-print is sufficient for MVP defensibility.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const scope = await requireScope().catch((e) => e);
  if (scope instanceof Response) return scope;

  const { id } = await ctx.params;
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(
      and(eq(schema.documents.id, id), eq(schema.documents.firmId, scope.firmId)),
    );
  if (!doc) return new Response("Not found", { status: 404 });

  const cites = await db
    .select()
    .from(schema.citations)
    .where(eq(schema.citations.documentId, id))
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

  const byCit = new Map<string, typeof verifs>();
  for (const v of verifs) {
    const arr = byCit.get(v.citationId) ?? [];
    arr.push(v);
    byCit.set(v.citationId, arr);
  }

  const rows = cites
    .map((c) => {
      const checks = byCit.get(c.id) ?? [];
      const checkRows = checks
        .map(
          (v) => `
          <tr>
            <td>${v.kind}</td>
            <td><b>${v.verdict}</b></td>
            <td>${escapeHtml(v.detail ?? "")}</td>
            <td>${v.sourceUrl ? `<a href="${v.sourceUrl}">link</a>` : ""}</td>
            <td>${new Date(v.createdAt).toISOString()}</td>
          </tr>`,
        )
        .join("");
      return `
      <section style="margin:24px 0;border-top:1px solid #ddd;padding-top:12px;">
        <h3 style="margin:0 0 4px;font-family:Georgia,serif;">${escapeHtml(c.caseName ?? "")}</h3>
        <div style="font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(c.normalized ?? c.rawText)} — verdict: <b>${c.verdict}</b></div>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
          <thead><tr style="text-align:left;background:#f3f1ea;">
            <th>Check</th><th>Verdict</th><th>Detail</th><th>Source</th><th>At</th>
          </tr></thead>
          <tbody>${checkRows || "<tr><td colspan=5><em>No checks recorded.</em></td></tr>"}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Veritas Verification Report — ${escapeHtml(doc.title)}</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;color:#0a0a0a;background:#fafaf7;max-width:880px;margin:32px auto;padding:0 32px;}
  h1{font-family:Georgia,serif;letter-spacing:.02em;margin:0;}
  .stamp{display:inline-block;border:1px solid #c9a961;color:#b8954a;padding:4px 10px;font-size:11px;letter-spacing:.25em;text-transform:uppercase;}
  .meta{color:#6b6b66;font-size:13px;margin-top:8px;}
  table{border-spacing:0;}
  th,td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;}
</style>
</head><body>
  <div class="stamp">Veritas — Verification Report</div>
  <h1 style="margin-top:8px;">${escapeHtml(doc.title)}</h1>
  <div class="meta">
    File: ${escapeHtml(doc.filename)} ·
    Citations: ${doc.citationCount} ·
    Verified: ${doc.verifiedCount} ·
    Warnings: ${doc.warningCount} ·
    Risks: ${doc.riskCount} ·
    Confidence: ${doc.confidenceScore ?? "—"}%
  </div>
  <div class="meta">Generated: ${new Date().toISOString()}</div>
  ${rows}
  <footer style="margin-top:48px;color:#6b6b66;font-size:11px;letter-spacing:.25em;text-transform:uppercase;text-align:center;">
    Trust. Verified.
  </footer>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
