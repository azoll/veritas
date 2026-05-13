import { put } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { requireScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { parseDocument } from "@/lib/parse";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/documents — upload a brief.
 * multipart/form-data: file, title, teamId
 *
 * Stores the original to Blob, parses it to text, kicks off verification
 * inline (no queue yet — Phase 2 will move this to Vercel Workflow).
 */
export async function POST(req: Request) {
  const scope = await requireScope().catch((e) => e);
  if (scope instanceof Response) return scope;

  const form = await req.formData();
  const file = form.get("file");
  const title = (form.get("title") as string | null) ?? "Untitled";
  const teamIdInput = form.get("teamId") as string | null;
  const deepScan = (form.get("deep") as string | null) === "true";
  if (!(file instanceof File)) {
    return Response.json({ error: "file required" }, { status: 400 });
  }

  // Resolve / auto-create a default team if none was passed.
  let teamId = teamIdInput;
  if (!teamId) {
    const [existing] = await db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.firmId, scope.firmId))
      .limit(1);
    if (existing) {
      teamId = existing.id;
    } else {
      const [created] = await db
        .insert(schema.teams)
        .values({ firmId: scope.firmId, name: "Default" })
        .returning();
      teamId = created.id;
      await db.insert(schema.teamMembers).values({
        teamId: created.id,
        userId: scope.userId,
        role: "admin",
      });
    }
  }

  const buf = await file.arrayBuffer();
  const { createHash } = await import("node:crypto");
  const contentHash = createHash("sha256")
    .update(Buffer.from(buf))
    .digest("hex");

  const blob = await put(`firms/${scope.firmId}/${Date.now()}-${file.name}`, buf, {
    access: "public", // private-by-token would be ideal; using public for MVP
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
      firmId: scope.firmId,
      teamId,
      uploadedById: scope.userId,
      title,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      blobUrl: blob.url,
      sizeBytes: buf.byteLength,
      rawText: parsed.text,
      status: "extracting",
      deepScan,
      contentHash,
    })
    .returning();

  await logAudit({
    firmId: scope.firmId,
    teamId,
    actorUserId: scope.userId,
    actorClerkId: scope.clerkUserId,
    action: "document.uploaded",
    targetKind: "document",
    targetId: doc.id,
    payload: { filename: file.name, sizeBytes: buf.byteLength },
  });

  // Init the verification job synchronously inside waitUntil
  // (extracts citations, inserts rows, status="verifying") and then
  // fire-and-forget the first verify-batch invocation. The batch
  // worker self-chains across multiple function invocations so no
  // single one needs to fit in 300s.
  const origin = (() => {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
  })();
  waitUntil(
    (async () => {
      try {
        const { verifyDocumentInit } = await import("@/lib/verify");
        await verifyDocumentInit(doc.id, scope.firmId);
        const { triggerVerifyBatch } = await import("@/lib/job-trigger");
        triggerVerifyBatch(origin, doc.id);
      } catch (e) {
        await db
          .update(schema.documents)
          .set({ status: "failed", error: (e as Error).message })
          .where(eq(schema.documents.id, doc.id));
      }
    })(),
  );

  return Response.json({ id: doc.id });
}

/** GET /api/documents — list firm's documents (most recent first). */
export async function GET() {
  const scope = await requireScope().catch((e) => e);
  if (scope instanceof Response) return scope;

  const rows = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.firmId, scope.firmId))
    .orderBy(schema.documents.createdAt);

  return Response.json({ documents: rows.reverse() });
}
