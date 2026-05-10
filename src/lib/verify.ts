/**
 * Verification orchestrator. For each extracted citation we run:
 *   1. existence check  — does CourtListener know this case?
 *   2. pincite/quote    — if a quote was attributed, does it appear in the opinion text?
 *   3. treatment        — basic signal from cluster.precedentialStatus + citation count.
 *
 * Each check produces a `verifications` row for full audit defensibility.
 * The roll-up verdict on the citation is the WORST of the per-check verdicts.
 */

import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  extractCitationsRegex,
  extractQuotesNearCitations,
  type ExtractedCitation,
} from "@/lib/extract";
import {
  fetchCluster,
  fetchOpinionText,
  searchByCitation,
} from "@/lib/courtlistener";
import { logAudit } from "@/lib/audit";

type Verdict = "verified" | "warning" | "risk" | "unknown";

const SEVERITY: Record<Verdict, number> = {
  verified: 0,
  unknown: 1,
  warning: 2,
  risk: 3,
};

function worst(a: Verdict, b: Verdict): Verdict {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Loose-fuzzy substring containment for pincite/quote checks. */
function quoteAppears(quoted: string, sourceText: string): { hit: boolean; score: number } {
  if (!sourceText) return { hit: false, score: 0 };
  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s ]+/g, " ").replace(/[“”"']/g, "").trim();
  const q = norm(quoted);
  const src = norm(sourceText);
  if (!q || q.length < 8) return { hit: false, score: 0 };
  if (src.includes(q)) return { hit: true, score: 100 };

  // Try a 5-gram-window approximate: shrink quote by trimming edges
  const tokens = q.split(" ");
  if (tokens.length < 6) return { hit: false, score: 0 };
  const windowSize = Math.max(8, Math.floor(tokens.length * 0.7));
  for (let i = 0; i + windowSize <= tokens.length; i++) {
    const sub = tokens.slice(i, i + windowSize).join(" ");
    if (src.includes(sub)) {
      return { hit: true, score: Math.round((windowSize / tokens.length) * 100) };
    }
  }
  return { hit: false, score: 0 };
}

export async function verifyDocument(documentId: string, firmId: string) {
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId));
  if (!doc) throw new Error("document not found");
  if (doc.firmId !== firmId) throw new Error("forbidden");
  if (!doc.rawText) throw new Error("document has no parsed text");

  await db
    .update(schema.documents)
    .set({ status: "extracting", updatedAt: new Date() })
    .where(eq(schema.documents.id, documentId));

  const cites = extractCitationsRegex(doc.rawText);
  const quotes = extractQuotesNearCitations(doc.rawText, cites);
  const quoteByIdx = new Map<number, string>();
  for (const q of quotes) quoteByIdx.set(q.citationIndex, q.quoted);

  // Insert citation rows, capture the new ids in order
  const citationIds: string[] = [];
  for (let i = 0; i < cites.length; i++) {
    const c = cites[i];
    const [row] = await db
      .insert(schema.citations)
      .values({
        documentId,
        firmId,
        rawText: c.rawText,
        normalized: `${c.volume} ${c.reporter} ${c.page}${c.pinpointPage ? ", " + c.pinpointPage : ""}`,
        caseName: c.caseName ?? null,
        reporter: c.reporter,
        volume: c.volume,
        page: c.page,
        pinpointPage: c.pinpointPage ?? null,
        court: c.court ?? null,
        year: c.year ?? null,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        contextSnippet: c.contextSnippet,
      })
      .returning({ id: schema.citations.id });
    citationIds.push(row.id);
  }

  await db
    .update(schema.documents)
    .set({ status: "verifying", citationCount: cites.length })
    .where(eq(schema.documents.id, documentId));

  let verified = 0;
  let warnings = 0;
  let risks = 0;

  for (let i = 0; i < cites.length; i++) {
    const c = cites[i];
    const citationId = citationIds[i];
    const quoted = quoteByIdx.get(i);

    const rolled = await verifyOneCitation({
      citationId,
      documentId,
      cite: c,
      quoted,
    });

    if (rolled === "verified") verified++;
    else if (rolled === "warning") warnings++;
    else if (rolled === "risk") risks++;
  }

  const total = cites.length || 1;
  const score = Math.round(
    ((verified + 0.5 * warnings) / total) * 100,
  );

  await db
    .update(schema.documents)
    .set({
      status: "ready",
      verifiedCount: verified,
      warningCount: warnings,
      riskCount: risks,
      confidenceScore: score,
      updatedAt: new Date(),
    })
    .where(eq(schema.documents.id, documentId));

  await logAudit({
    firmId,
    action: "document.verified",
    targetKind: "document",
    targetId: documentId,
    payload: { citations: cites.length, verified, warnings, risks, score },
  });

  return { citations: cites.length, verified, warnings, risks, score };
}

async function verifyOneCitation(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
  quoted?: string;
}): Promise<Verdict> {
  const { citationId, documentId, cite, quoted } = args;
  let rolled: Verdict = "verified";

  // ── Existence check ──────────────────────────────────────────────
  const query = `${cite.volume} ${cite.reporter} ${cite.page}`;
  const hit = await searchByCitation(query);

  if (!hit) {
    rolled = worst(rolled, "risk");
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: "risk",
      source: "courtlistener:search",
      detail:
        "No matching opinion found in CourtListener. This citation may be hallucinated, mistyped, or unreported.",
      raw: { query } as never,
    });
    await db
      .update(schema.citations)
      .set({ verdict: rolled, notes: "No matching opinion found." })
      .where(eq(schema.citations.id, citationId));
    return rolled;
  }

  // Sanity check: case-name agreement (when supplied)
  let nameMismatch = false;
  if (cite.caseName) {
    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 v]/g, " ").replace(/\s+/g, " ").trim();
    const a = norm(cite.caseName);
    const b = norm(hit.caseName);
    nameMismatch = !a.split(" v ").some((part) => part && b.includes(part));
  }

  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: nameMismatch ? "warning" : "verified",
    source: `courtlistener:cluster/${hit.clusterId}`,
    sourceUrl: hit.absoluteUrl,
    detail: nameMismatch
      ? `Found ${hit.caseName} at ${query}, but the brief styles it as ${cite.caseName}.`
      : `Confirmed ${hit.caseName} at ${query}.`,
    raw: { hit } as never,
  });
  if (nameMismatch) rolled = worst(rolled, "warning");

  // ── Treatment / staleness ───────────────────────────────────────
  const cluster = await fetchCluster(hit.clusterId);
  if (cluster) {
    const status = cluster.precedentialStatus.toLowerCase();
    let tVerdict: Verdict = "verified";
    let detail = `Precedential status: ${cluster.precedentialStatus}. Cited by ${cluster.citationCount} opinions.`;
    if (status.includes("unpublished") || status.includes("nonprecedential")) {
      tVerdict = "warning";
      detail += " Non-precedential — verify local rules permit reliance.";
    }
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "treatment",
      verdict: tVerdict,
      source: `courtlistener:cluster/${hit.clusterId}`,
      sourceUrl: hit.absoluteUrl,
      detail,
      raw: { cluster } as never,
    });
    if (tVerdict !== "verified") rolled = worst(rolled, tVerdict);
  }

  // ── Pincite / quote check ───────────────────────────────────────
  if (quoted && cluster?.subOpinions?.length) {
    const opIdMatch = cluster.subOpinions[0]?.match(/\/(\d+)\/?$/);
    const opinionId = opIdMatch ? Number(opIdMatch[1]) : null;
    if (opinionId) {
      const op = await fetchOpinionText(opinionId);
      if (op?.plainText) {
        const { hit: qHit, score } = quoteAppears(quoted, op.plainText);
        const qVerdict: Verdict = qHit
          ? score >= 95
            ? "verified"
            : "warning"
          : "risk";
        await db.insert(schema.quotes).values({
          citationId,
          quotedText: quoted,
          sourceText: qHit ? quoted : null,
          matchScore: score,
          verdict: qVerdict,
        });
        await db.insert(schema.verifications).values({
          citationId,
          documentId,
          kind: "pincite",
          verdict: qVerdict,
          source: `courtlistener:opinion/${opinionId}`,
          sourceUrl: hit.absoluteUrl,
          detail: qHit
            ? score >= 95
              ? "Quoted language found in the opinion."
              : "Quoted language partially matches — wording may have been altered."
            : "Quoted language not found in the opinion.",
          raw: { quoted, score } as never,
        });
        rolled = worst(rolled, qVerdict);
      }
    }
  }

  await db
    .update(schema.citations)
    .set({ verdict: rolled })
    .where(eq(schema.citations.id, citationId));

  // touch updated_at on doc
  await db
    .update(schema.documents)
    .set({ updatedAt: sql`now()` })
    .where(eq(schema.documents.id, documentId));

  return rolled;
}

export { hash };
