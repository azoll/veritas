import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyDocumentBatch } from "@/lib/verify";
import {
  triggerVerifyBatch,
  verifyJobSecretMatches,
} from "@/lib/job-trigger";

export const runtime = "nodejs";
// Each batch processes VERIFY_BATCH_SIZE (8) citations. With the 4-worker
// concurrency pool and CL throttle that's ~60-90s of work per invocation,
// well inside the 300s budget. We set maxDuration high enough to cover
// the worst case (CL retries on every cite).
export const maxDuration = 300;

/**
 * Self-chaining batch worker. Processes the next chunk of citations
 * for a document, then either kicks itself again (more work remains)
 * or lets the document settle to "ready" status (work complete).
 *
 * The endpoint is gated by INTERNAL_JOB_SECRET; only the upload
 * routes and a prior verify-batch invocation should call it.
 *
 * Errors mark the document "failed" so the trial cookie clears and
 * the user can re-upload. Transient errors (e.g. a CourtListener
 * burst we couldn't ride out) bubble up to the chain; the upload
 * route can re-trigger if the user retries.
 */
export async function POST(req: Request) {
  if (!verifyJobSecretMatches(req)) {
    return new Response("Forbidden", { status: 403 });
  }
  const url = new URL(req.url);
  const documentId = url.searchParams.get("id");
  if (!documentId) {
    return Response.json({ error: "missing id" }, { status: 400 });
  }

  // Resolve the firm via the document itself — we don't want to
  // trust query params for tenant scoping. The Internal secret
  // gates who can call us; the document row gates what firm context
  // the batch runs in.
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId));
  if (!doc) {
    return Response.json({ error: "document not found" }, { status: 404 });
  }

  try {
    const result = await verifyDocumentBatch(documentId, doc.firmId);
    if (!result.done) {
      // More work remains — kick the chain forward.
      const origin = `${url.protocol}//${url.host}`;
      triggerVerifyBatch(origin, documentId);
    }
    return Response.json({
      ok: true,
      done: result.done,
      processed: result.processed,
      nextIndex: result.nextIndex,
    });
  } catch (e) {
    const message = (e as Error).message;
    console.error(`[verify-batch] failed for ${documentId}:`, message);
    // Mark the doc failed so the UI shows an error state and the
    // trial cookie clears on next visit. Watchdog could resume,
    // but for now we surface failures honestly.
    await db
      .update(schema.documents)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(schema.documents.id, documentId));
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
