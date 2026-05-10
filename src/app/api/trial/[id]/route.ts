import { cookies } from "next/headers";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { TRIAL_COOKIE } from "@/lib/trial";

export const runtime = "nodejs";

/**
 * Fetch a trial scan's results. Scope is the trial cookie — only the
 * uploader can read their own scan. Expired docs return 410 Gone.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const sessionId = (await cookies()).get(TRIAL_COOKIE)?.value;
  if (!sessionId) return new Response("forbidden", { status: 403 });

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.id, id),
        eq(schema.documents.trialSessionId, sessionId),
        gt(schema.documents.expiresAt, new Date()),
      ),
    );
  if (!doc) return new Response("not found or expired", { status: 410 });

  const cites = await db
    .select()
    .from(schema.citations)
    .where(eq(schema.citations.documentId, id));
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
  return Response.json({ document: doc, citations: cites, verifications: verifs });
}
