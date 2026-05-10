import { cookies } from "next/headers";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { parseDocument } from "@/lib/parse";
import { logAudit } from "@/lib/audit";
import {
  TRIAL_COOKIE,
  getAnonymousFirm,
  getAnonymousTeam,
  newTrialSessionId,
  trialExpiry,
} from "@/lib/trial";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Anonymous trial upload. Allows ONE standard scan without auth; result is
 * stored 24h, then auto-expires. Trial users who sign up can claim their
 * scan into their new firm via the claim flow.
 *
 * - Form fields: `file` (required), `title` (optional)
 * - Always runs a STANDARD scan (existence + treatment + pincite).
 *   Deep scans require a paid plan and are not available anonymously.
 * - Sets the `v_trial` HttpOnly cookie so refreshes/return-visits reach the
 *   same scan history.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const title = (form.get("title") as string | null) ?? "Untitled";

  if (!(file instanceof File)) {
    return Response.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json(
      { error: "Trial uploads are capped at 10 MB. Sign up for higher limits." },
      { status: 413 },
    );
  }

  const cookieStore = await cookies();
  let sessionId = cookieStore.get(TRIAL_COOKIE)?.value;
  const fresh = !sessionId;
  if (!sessionId) sessionId = newTrialSessionId();

  // Enforce 1-scan-per-trial-session limit
  if (!fresh) {
    const existing = await db
      .select({ id: schema.documents.id })
      .from(schema.documents)
      .where(eq(schema.documents.trialSessionId, sessionId));
    if (existing.length >= 1) {
      return Response.json(
        {
          error:
            "Trial limit reached (1 scan). Create an account to keep scanning.",
        },
        { status: 429 },
      );
    }
  }

  const firm = await getAnonymousFirm();
  const team = await getAnonymousTeam(firm.id);

  // Anonymous trial needs a dummy uploader user so the FK is satisfied.
  let [anonUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkUserId, "__anonymous__"));
  if (!anonUser) {
    [anonUser] = await db
      .insert(schema.users)
      .values({
        clerkUserId: "__anonymous__",
        firmId: firm.id,
        email: "anonymous@veritas.local",
        name: "Anonymous",
        role: "system",
      })
      .returning();
  }

  const buf = await file.arrayBuffer();
  const blob = await put(`trials/${sessionId}/${Date.now()}-${file.name}`, buf, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  let parsed;
  try {
    parsed = await parseDocument(buf, file.type, file.name);
  } catch (e) {
    return Response.json(
      { error: `parse failed: ${(e as Error).message}` },
      { status: 415 },
    );
  }

  const [doc] = await db
    .insert(schema.documents)
    .values({
      firmId: firm.id,
      teamId: team.id,
      uploadedById: anonUser.id,
      title,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      blobUrl: blob.url,
      sizeBytes: buf.byteLength,
      rawText: parsed.text,
      status: "extracting",
      deepScan: false,
      trialSessionId: sessionId,
      expiresAt: trialExpiry(),
    })
    .returning();

  await logAudit({
    firmId: firm.id,
    teamId: team.id,
    actorUserId: anonUser.id,
    action: "trial.uploaded",
    targetKind: "document",
    targetId: doc.id,
    payload: { filename: file.name, sessionId },
  });

  void import("@/lib/verify").then(({ verifyDocument }) =>
    verifyDocument(doc.id, firm.id).catch(async (e) => {
      await db
        .update(schema.documents)
        .set({ status: "failed", error: (e as Error).message })
        .where(eq(schema.documents.id, doc.id));
    }),
  );

  const res = Response.json({ id: doc.id, trial: true });
  if (fresh) {
    // 25h cookie — slightly longer than the doc's 24h TTL so the user can
    // still see "your trial has expired" rather than a 404.
    cookieStore.set(TRIAL_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 25,
      path: "/",
    });
  }
  return res;
}
