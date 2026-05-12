import { and, eq, inArray } from "drizzle-orm";
import { del } from "@vercel/blob";
import { requireScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

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
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });

  const cites = await db
    .select()
    .from(schema.citations)
    .where(eq(schema.citations.documentId, id));

  const verifs = await db
    .select()
    .from(schema.verifications)
    .where(eq(schema.verifications.documentId, id));

  const quotes = cites.length
    ? await db
        .select()
        .from(schema.quotes)
        .where(
          inArray(
            schema.quotes.citationId,
            cites.map((c) => c.id),
          ),
        )
    : [];

  return Response.json({
    document: doc,
    citations: cites,
    verifications: verifs,
    quotes,
  });
}

/**
 * Delete a document the requesting firm owns. Cascading FKs in the
 * schema take care of citations / verifications / quotes; we still
 * try to remove the stored blob so we don't leak storage on the
 * other side of the DB cleanup. Blob removal is best-effort — if it
 * fails we still drop the DB row, since a dangling blob is far less
 * harmful than a "delete" button that lies.
 */
export async function DELETE(
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
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });

  if (doc.blobUrl) {
    try {
      await del(doc.blobUrl);
    } catch (e) {
      console.warn(
        `[documents.delete] blob removal failed for ${id}:`,
        (e as Error).message,
      );
    }
  }

  await db.delete(schema.documents).where(eq(schema.documents.id, id));

  await logAudit({
    firmId: scope.firmId,
    action: "document.deleted",
    targetKind: "document",
    targetId: id,
    payload: { filename: doc.filename, title: doc.title },
  });

  return Response.json({ ok: true });
}
