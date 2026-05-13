import { Redis } from "@upstash/redis";
import { verifyJobSecretMatches } from "@/lib/job-trigger";

export const runtime = "nodejs";

/**
 * GET /api/jobs/cache-metrics
 *
 * Returns hit/miss counters for each cacheable domain. Used to track
 * cache effectiveness over time without standing up a full
 * observability stack.
 *
 * Gated by INTERNAL_JOB_SECRET so prospects can't peek at internal
 * metrics, but lets ops monitor cache health.
 */

const URL_ENV = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export async function GET(req: Request) {
  if (!verifyJobSecretMatches(req)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!URL_ENV || !TOKEN) {
    return Response.json({
      ok: false,
      reason: "cache_not_provisioned",
      hint: "Install Upstash Redis via Vercel Marketplace and redeploy.",
    });
  }
  const client = new Redis({ url: URL_ENV, token: TOKEN });
  const domains = ["cite", "cluster", "opinion", "prop", "lii-usc", "lii-cfr", "lii-rule"];
  const results: Record<string, { hits: number; misses: number; hitRate: number }> = {};
  for (const d of domains) {
    const [hits, misses] = await Promise.all([
      client.get<number>(`metrics:${d}:hit`),
      client.get<number>(`metrics:${d}:miss`),
    ]);
    const h = hits ?? 0;
    const m = misses ?? 0;
    const total = h + m;
    results[d] = {
      hits: h,
      misses: m,
      hitRate: total > 0 ? Math.round((h / total) * 1000) / 10 : 0,
    };
  }
  return Response.json({ ok: true, metrics: results });
}
