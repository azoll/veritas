/**
 * Self-chaining job trigger. Verification work is split across
 * multiple Vercel function invocations so a single brief never
 * needs to fit in one 300-second budget. The upload route calls
 * triggerVerifyBatch() once after init; each verify-batch invocation
 * calls it again until the document is done.
 *
 * Internal endpoints are gated by a shared secret to prevent random
 * callers from triggering verification work for arbitrary documents.
 */

const SECRET = process.env.INTERNAL_JOB_SECRET ?? "";
export const INTERNAL_JOB_HEADER = "x-veritas-job-secret";

export function verifyJobSecretMatches(req: Request): boolean {
  if (!SECRET) {
    // In dev with no secret set we accept all calls. Production
    // must set INTERNAL_JOB_SECRET — middleware should enforce this.
    return true;
  }
  return req.headers.get(INTERNAL_JOB_HEADER) === SECRET;
}

/**
 * Fire-and-forget kick of the verify-batch endpoint for a document.
 * Caller does NOT await the resulting verification — the response
 * returns immediately while the work happens in the chained
 * function invocation.
 *
 * `baseUrl` is the public origin of the deployment, e.g.
 * "https://veritaslaw.app". Pulled from the request URL by the
 * route handler.
 */
export function triggerVerifyBatch(baseUrl: string, documentId: string): void {
  const url = `${baseUrl}/api/jobs/verify-batch?id=${encodeURIComponent(documentId)}`;
  // Fire-and-forget. We intentionally don't await — the verify-batch
  // endpoint is responsible for its own work and for chaining its
  // successor invocation when more work remains.
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [INTERNAL_JOB_HEADER]: SECRET,
    },
    // Keep-alive helps the request survive the parent function's
    // graceful shutdown after the response returns.
    keepalive: true,
  }).catch((e) => {
    // Don't crash the caller — the watchdog will pick up a stalled
    // chain eventually.
    console.warn(`[job-trigger] failed to kick verify-batch for ${documentId}:`, e);
  });
}
