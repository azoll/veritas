/**
 * AI Gateway wrapper. Model-agnostic per Principle 3 — we route through
 * Vercel AI Gateway with a `provider/model` string so providers can be
 * swapped without touching call sites.
 *
 * Returns `null` when AI_GATEWAY_API_KEY is missing so the verification
 * pipeline degrades gracefully (the deterministic checks still run).
 */

import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { createHash } from "node:crypto";
import { z } from "zod";
import { CACHE_VERSION, TTL, cacheGet, cacheIncr, cacheSet } from "./cache";

// AI Gateway model id format is "provider/model" with dot-separated
// version numbers (claude-sonnet-4.6, not claude-sonnet-4-6).
const PROPOSITION_MODEL = "anthropic/claude-sonnet-4.6";

const PropositionSchema = z.object({
  verdict: z.enum(["supports", "overstates", "unsupported", "contradicts"]),
  reasoning: z.string().min(10).max(600),
});

export type PropositionResult = z.infer<typeof PropositionSchema> & {
  model: string;
  promptHash: string;
};

export function aiAvailable(): boolean {
  // Explicit gateway key OR Vercel-injected OIDC token (auto-present on
  // every Vercel deployment) is enough to call the AI Gateway.
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export async function checkProposition(args: {
  caseName: string;
  citation: string;
  opinionText: string;
  proposition: string;
}): Promise<PropositionResult | null> {
  if (!aiAvailable()) return null;

  // Cap opinion text. Many opinions exceed 100K chars; the relevant holding
  // is almost always in the first ~40K. We trade a small loss in fidelity
  // for predictable token cost per scan.
  const op = args.opinionText.slice(0, 40_000);
  const prompt = `You are evaluating whether a cited legal authority actually supports the proposition a brief is claiming. You are not a lawyer. You produce structured verdicts only.

Cited authority: ${args.caseName} — ${args.citation}

Opinion text (excerpt, may be truncated):
"""
${op}
"""

The brief asserts this proposition in the surrounding context:
"""
${args.proposition}
"""

Determine whether the cited opinion supports the asserted proposition.

Verdict definitions:
- "supports":     the opinion plainly says what the brief claims.
- "overstates":   the opinion supports a narrower or qualified version; the brief overgeneralizes.
- "unsupported":  the opinion does not address the claim. Reading it does not establish the proposition.
- "contradicts":  the opinion holds the opposite, or directly undermines the claim.

Be conservative: only mark "supports" when the opinion clearly says what the brief claims. If you cannot locate supporting language in the excerpt, prefer "unsupported".

Respond in 1–2 sentences, quoting the most relevant passage when possible.`;

  const promptHash = createHash("sha256")
    .update(prompt)
    .digest("hex")
    .slice(0, 16);

  // Cache key: full SHA-256 of the prompt. Two scans of the same
  // citation with the same surrounding argument paragraph produce
  // the same prompt → the same verdict. AI inference is the most
  // expensive component of a scan (both wall-time and cash); this
  // cache is the highest-value entry in the layer.
  //
  // Note we key on the prompt hash, not on (citationId, snippet),
  // so the cache is portable across documents and trial sessions.
  // Same brief cited the same way in two different filings = one
  // AI call, not two.
  const cacheKey = `${CACHE_VERSION}:prop:${createHash("sha256").update(prompt).digest("hex")}`;
  const cached = await cacheGet<PropositionResult>(cacheKey);
  if (cached) {
    await cacheIncr("metrics:prop:hit");
    return cached;
  }
  await cacheIncr("metrics:prop:miss");

  try {
    const { object } = await generateObject({
      model: gateway(PROPOSITION_MODEL),
      schema: PropositionSchema,
      prompt,
      temperature: 0,
    });
    const result: PropositionResult = {
      ...object,
      model: PROPOSITION_MODEL,
      promptHash,
    };
    // Propositions are deterministic for a given prompt at temperature
    // 0; cache forever (model upgrades bump CACHE_VERSION).
    await cacheSet(cacheKey, result, TTL.FOREVER);
    return result;
  } catch (e) {
    console.warn("[veritas] proposition check failed:", (e as Error).message);
    return null;
  }
}
