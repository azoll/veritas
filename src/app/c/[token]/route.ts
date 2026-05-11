import { loadCertificateByToken, renderCertificateHtml } from "@/lib/certificate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public Certificate page — `/c/<token>`. Anyone with the URL can read
 * the certificate (the token is unguessable; deliberately granting
 * access by URL is the intended sharing model). Used by:
 *   - opposing counsel verifying a Veritas-reviewed filing
 *   - reviewing partners signing off internally
 *   - bar / court reviewers checking provenance
 *
 * Implemented as a route handler returning HTML directly so the
 * certificate prints cleanly and can be saved as a PDF without
 * involving React hydration.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const data = await loadCertificateByToken(token);
  if (!data) return new Response("Certificate not found", { status: 404 });

  const url = new URL(req.url);
  const publicUrl = `${url.protocol}//${url.host}`;
  const html = renderCertificateHtml(data, { publicUrl });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
