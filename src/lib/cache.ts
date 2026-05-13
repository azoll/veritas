/**
 * Cache adapter — Vercel Marketplace Upstash Redis with graceful
 * no-op fallback.
 *
 * The verification pipeline calls this for every cacheable lookup
 * (citation existence, cluster metadata, opinion text, AI proposition
 * verdicts). When the upstream env vars are absent — e.g. local dev
 * before provisioning, or any deployment that hasn't been linked to
 * the Vercel Marketplace Upstash add-on — every call becomes a
 * deterministic miss and the verifier transparently falls back to
 * calling CourtListener / the AI Gateway directly. That means we can
 * ship the cache layer today and it activates the moment the storage
 * provider is wired.
 *
 * Provisioning, when you're ready:
 *   1. Vercel → Storage → Marketplace → install "Upstash for Redis"
 *   2. Connect it to the `veritas` project (auto-injects
 *      KV_REST_API_URL and KV_REST_API_TOKEN env vars)
 *   3. Redeploy. No code change needed — cacheGet/Set immediately
 *      start hitting Redis.
 *
 * Cache key scheme: `v1:<domain>:<deterministic id>` so the v1
 * prefix lets us bump the cache version (e.g. on regex changes that
 * would invalidate prior verdicts) without flushing everything.
 */

import { Redis } from "@upstash/redis";

const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

let client: Redis | null = null;
if (URL && TOKEN) {
  try {
    client = new Redis({ url: URL, token: TOKEN });
  } catch (e) {
    console.warn("[cache] failed to initialize Upstash client:", (e as Error).message);
  }
}

export const CACHE_VERSION = "v1";

/** Returns true when the cache is wired and ready to serve. */
export function cacheAvailable(): boolean {
  return client !== null;
}

/**
 * Read a cached value. Returns null on miss, on error, or when the
 * cache adapter is in no-op mode. The verifier treats all of these
 * uniformly — fall through to the upstream source.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!client) return null;
  try {
    const v = await client.get<T>(key);
    return v ?? null;
  } catch (e) {
    console.warn(`[cache] get failed for ${key}:`, (e as Error).message);
    return null;
  }
}

/**
 * Write a value to the cache with a TTL in seconds. TTL=null means
 * "cache forever" (Upstash represents this as no EX option).
 * Failures are swallowed — caching is opportunistic, not load-bearing.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number | null,
): Promise<void> {
  if (!client) return;
  try {
    if (ttlSeconds === null) {
      await client.set(key, value);
    } else {
      await client.set(key, value, { ex: ttlSeconds });
    }
  } catch (e) {
    console.warn(`[cache] set failed for ${key}:`, (e as Error).message);
  }
}

/**
 * Increment a counter — used for hit/miss observability. Failures
 * are swallowed.
 */
export async function cacheIncr(key: string, by = 1): Promise<void> {
  if (!client) return;
  try {
    await client.incrby(key, by);
  } catch {
    // observability is opportunistic
  }
}

/** TTL constants per the roadmap-defined cache policy. */
export const TTL = {
  /** Citation lookup results: address never changes after publication. */
  FOREVER: null,
  /** Cluster metadata (citation count grows). Refresh monthly. */
  THIRTY_DAYS: 60 * 60 * 24 * 30,
  /** LII statute/rule pages. Statutes amend annually. */
  SEVEN_DAYS: 60 * 60 * 24 * 7,
  /** Failed lookups — give upstream time to ingest the missing case. */
  ONE_DAY: 60 * 60 * 24,
} as const;
