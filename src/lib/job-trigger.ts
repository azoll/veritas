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

/**
 * Accept either:
 *   - INTERNAL_JOB_SECRET via `x-veritas-job-secret` header (our own
 *     self-chain triggers + curl invocations from ops)
 *   - CRON_SECRET via `Authorization: Bearer ...` (Vercel Cron's
 *     auto-injected auth pattern)
 *
 * If neither is configured, accept everything (dev convenience).
 */
export function verifyJobSecretMatches(req: Request): boolean {
  if (!SECRET && !process.env.CRON_SECRET) return true;
  if (SECRET && req.headers.get(INTERNAL_JOB_HEADER) === SECRET) return true;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  return false;
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
