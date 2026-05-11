import { eq } from "drizzle-orm";
import { requireScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import {
  loadCertificateData,
  renderCertificateHtml,
} from "@/lib/certificate";

export const runtime = "nodejs";

/**
 * GET /api/documents/:id/certificate — authenticated certificate render.
 * Returns the same HTML as the public /c/<token> page; useful as a
 * direct print/download link from the dashboard.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const scope = await requireScope().catch((e) => e);
  if (scope instanceof Response) return scope;

  const { id } = await ctx.params;
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id));
  if (!doc || doc.firmId !== scope.firmId)
    return new Response("Not found", { status: 404 });

  const data = await loadCertificateData(id);
  if (!data) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const publicUrl = `${url.protocol}//${url.host}`;
  const html = renderCertificateHtml(data, { publicUrl });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
