import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { TRIAL_COOKIE } from "@/lib/trial";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/trial/:id/lead
 *
 * Email-capture wall for the anonymous trial result page. The scan
 * itself runs immediately; the *result* is gated behind email capture.
 * Trial users provide an email (+ optional firm/name), we record them
 * as a marketing lead, and the result becomes visible.
 *
 * Same-session check: only the trial-cookie holder can submit a lead
 * for their own document. Prevents lead-spamming a third party's
 * document URL.
 */
const Body = z.object({
  email: z.string().email().max(200),
  name: z.string().max(200).optional(),
  firm: z.string().max(200).optional(),
  optInUpdates: z.boolean().optional(),
});

export async function POST(
  req: Request,
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

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  await db.insert(schema.trialLeads).values({
    email: parsed.data.email,
    name: parsed.data.name ?? null,
    firm: parsed.data.firm ?? null,
    trialSessionId: sessionId,
    documentId: doc.id,
    source: "trial_scan",
    optInUpdates: parsed.data.optInUpdates ?? true,
  });

  await logAudit({
    firmId: doc.firmId,
    teamId: doc.teamId,
    action: "trial.lead_captured",
    targetKind: "document",
    targetId: doc.id,
    payload: { email: parsed.data.email, firm: parsed.data.firm ?? null },
  });

  // Set a same-session cookie so the result page knows the wall has been
  // satisfied without round-tripping the DB on every refresh.
  const res = Response.json({ ok: true });
  (await cookies()).set(`v_lead_${doc.id}`, "1", {
    httpOnly: false, // client component reads this to unlock UI
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 25,
    path: "/",
  });
  return res;
}
