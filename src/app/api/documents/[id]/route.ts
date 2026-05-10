import { and, eq, inArray } from "drizzle-orm";
import { requireScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";

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
