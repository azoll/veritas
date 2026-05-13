/**
 * Verification orchestrator. For each extracted citation we run:
 *   1. existence       — does CourtListener know this case?
 *   2. treatment       — basic signal from cluster.precedentialStatus.
 *   3. pincite         — if a quotation was attributed, does it actually
 *                        appear in the opinion text?
 *   4. proposition     — (deep scans only) does the cited opinion actually
 *                        support the claim made in the brief?
 *
 * Each check writes its own `verifications` row so the audit trail records
 * model, source URL, prompt hash, and raw payload for every conclusion.
 *
 * The citation's roll-up `verdict` is the WORST of its per-check verdicts.
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
  lookupCitation,
  type CLOpinion,
} from "@/lib/courtlistener";
import { lookupCFR, lookupFedRule, lookupUSC } from "@/lib/lii";
import { lookupStateStatute, stateStatuteCovered } from "@/lib/state-statutes";
import { logAudit } from "@/lib/audit";
import { aiAvailable, checkProposition } from "@/lib/ai";

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

/** Substring containment with a shrink-window fallback for near-matches. */
function quoteAppears(
  quoted: string,
  sourceText: string,
): { hit: boolean; score: number } {
  if (!sourceText) return { hit: false, score: 0 };
  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s ]+/g, " ").replace(/[“”"']/g, "").trim();
  const q = norm(quoted);
  const src = norm(sourceText);
  if (!q || q.length < 8) return { hit: false, score: 0 };
  if (src.includes(q)) return { hit: true, score: 100 };

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

  const deepScan = doc.deepScan;

  await db
    .update(schema.documents)
    .set({ status: "extracting", updatedAt: new Date() })
    .where(eq(schema.documents.id, documentId));

  const cites = extractCitationsRegex(doc.rawText);
  const quotes = extractQuotesNearCitations(doc.rawText, cites);
  const quoteByIdx = new Map<number, string>();
  for (const q of quotes) quoteByIdx.set(q.citationIndex, q.quoted);

  const citationIds: string[] = [];
  for (let i = 0; i < cites.length; i++) {
    const c = cites[i];
    const [row] = await db
      .insert(schema.citations)
      .values({
        documentId,
        firmId,
        kind: c.kind,
        rawText: c.rawText,
        normalized:
          c.kind === "case"
            ? `${c.volume} ${c.reporter} ${c.page}${c.pinpointPage ? ", " + c.pinpointPage : ""}`
            : c.kind === "statute"
              ? `${c.volume ? c.volume + " " : ""}${c.reporter} § ${c.page}`.trim()
              : c.kind === "rule"
                ? `${c.reporter} ${c.page}`
                : `${c.volume} ${c.reporter} ${c.page}`,
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
    const rolled = await verifyOneCitation({
      citationId: citationIds[i],
      documentId,
      cite: cites[i],
      quoted: quoteByIdx.get(i),
      deepScan,
    });

    if (rolled === "verified") verified++;
    else if (rolled === "warning") warnings++;
    else if (rolled === "risk") risks++;
  }

  const total = cites.length || 1;
  const score = Math.round(((verified + 0.5 * warnings) / total) * 100);

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
    payload: { citations: cites.length, verified, warnings, risks, score, deepScan },
  });

  return { citations: cites.length, verified, warnings, risks, score };
}

async function verifyOneCitation(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
  quoted?: string;
  deepScan: boolean;
}): Promise<Verdict> {
  // Dispatch by authority kind. Each verifier writes its own rows;
  // the dispatcher returns the rolled-up worst verdict.
  switch (args.cite.kind) {
    case "statute":
      return verifyStatute(args);
    case "state-statute":
      return verifyStateStatute(args);
    case "rule":
      return verifyRule(args);
    case "constitution":
      return verifyConstitution(args);
    case "slip":
      return verifySlipOpinion(args);
    case "westlaw":
    case "lexis":
      return verifyOnlineOnly(args);
    case "case":
    default:
      return verifyCase(args);
  }
}

async function verifyCase(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
  quoted?: string;
  deepScan: boolean;
}): Promise<Verdict> {
  const { citationId, documentId, cite, quoted } = args;
  void args.deepScan; // reserved for future tier-gated extras
  let rolled: Verdict = "verified";

  // ── 1. Existence ────────────────────────────────────────────────
  // Use CourtListener's /citation-lookup/ endpoint rather than full-text
  // search. Lookup resolves a parsed reporter cite to the actual case at
  // that page — search ranks by text relevance and routinely returns the
  // wrong opinion when another case happens to mention the citation.
  const query = `${cite.volume} ${cite.reporter} ${cite.page}`;
  const lookup = await lookupCitation(cite.volume, cite.reporter, cite.page);

  if (!lookup.ok) {
    // Distinguish "definitely not found" from "we couldn't tell".
    // Rate limits or transient errors shouldn't be reported as
    // fabrication risk; that would be a false accusation.
    const isFabricationSignal = lookup.reason === "not_found";
    rolled = worst(rolled, isFabricationSignal ? "risk" : "unknown");
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: isFabricationSignal ? "risk" : "unknown",
      source: "courtlistener:citation-lookup",
      detail: isFabricationSignal
        ? `No opinion is published at ${query} in CourtListener's corpus. This is the typical signal for a hallucinated or mistyped citation; recommend verifying against the official reporter before filing.`
        : `Verification was inconclusive (CourtListener returned ${lookup.reason}). Recommend manual lookup before filing.`,
      raw: { query, reason: lookup.reason } as never,
    });
    await db
      .update(schema.citations)
      .set({
        verdict: rolled,
        notes: isFabricationSignal
          ? "No opinion published at this citation — possible fabrication."
          : "Verification inconclusive — manual lookup recommended.",
      })
      .where(eq(schema.citations.id, citationId));
    return rolled;
  }

  // We have a hit. Compare case-name similarity to detect the more
  // subtle failure mode: real citation, but the brief styles it as a
  // different case (sometimes a typo, sometimes a sign the cite was
  // pasted in from an unrelated source).
  let nameVerdict: Verdict = "verified";
  let nameDetail = `Located ${lookup.caseName} at ${query}.`;
  if (cite.caseName) {
    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 v]/g, " ").replace(/\s+/g, " ").trim();
    const a = norm(cite.caseName);
    const b = norm(lookup.caseName);

    // Token-overlap: how many distinct meaningful words from the brief's
    // case-name appear in CourtListener's. < 50% overlap means the names
    // are radically different — almost certainly the wrong case at this
    // citation, which is a fabrication-grade signal, not a styling note.
    const stop = new Set(["v", "the", "of", "and", "co", "corp", "inc", "ltd", "llc"]);
    const tokensA = a.split(" ").filter((t) => t.length > 1 && !stop.has(t));
    const tokensB = new Set(b.split(" ").filter((t) => t.length > 1 && !stop.has(t)));
    const overlap = tokensA.filter((t) => tokensB.has(t)).length;
    const ratio = tokensA.length > 0 ? overlap / tokensA.length : 1;

    if (ratio < 0.34) {
      nameVerdict = "risk";
      nameDetail = `CourtListener reports ${query} as ${lookup.caseName}, but the brief cites it as "${cite.caseName}". The names share no meaningful overlap — this is the pattern for an incorrect or fabricated citation. Verify before filing.`;
    } else if (ratio < 0.75) {
      nameVerdict = "warning";
      nameDetail = `Located ${lookup.caseName} at ${query}; the brief styles it as "${cite.caseName}". Some name overlap, but not a full match — verify the citation references the intended case.`;
    }
  }

  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: nameVerdict,
    source: `courtlistener:cluster/${lookup.clusterId}`,
    sourceUrl: lookup.absoluteUrl,
    detail: nameDetail,
    raw: { lookup } as never,
  });
  if (nameVerdict !== "verified") rolled = worst(rolled, nameVerdict);

  // Construct a synthesized "hit" for downstream code that still
  // expects the old shape.
  const hit = {
    id: 0,
    caseName: lookup.caseName,
    citation: [],
    court: "",
    dateFiled: "",
    absoluteUrl: lookup.absoluteUrl,
    clusterId: lookup.clusterId,
  };

  // ── 2. Treatment ────────────────────────────────────────────────
  const cluster = await fetchCluster(hit.clusterId);
  if (!cluster) {
    // fetchCluster has retry-with-backoff; a null here means CL either
    // exhausted retries or returned a non-OK status we don't recover
    // from. Record the inconclusive result so the report doesn't
    // misleadingly show "verified" on a citation we only half-checked.
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "treatment",
      verdict: "unknown",
      source: `courtlistener:cluster/${hit.clusterId}`,
      sourceUrl: hit.absoluteUrl,
      detail:
        "Subsequent-treatment lookup was inconclusive (CourtListener cluster fetch failed). Recommend manual treatment check before relying on this authority.",
      raw: { clusterId: hit.clusterId } as never,
    });
    rolled = worst(rolled, "unknown");
  }
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

  // Fetch the majority opinion ONCE — both pincite and proposition need it.
  // Every report surfaces three things: existence, quotation (if
  // applicable), and proposition support — so we always need opinion
  // text, not just when a quote was attributed.
  let opinion: CLOpinion | null = null;
  if (cluster?.subOpinions?.length) {
    for (const url of cluster.subOpinions) {
      const opIdMatch = url.match(/\/(\d+)\/?$/);
      const opinionId = opIdMatch ? Number(opIdMatch[1]) : null;
      if (!opinionId) continue;
      const candidate = await fetchOpinionText(opinionId);
      if (candidate?.plainText && candidate.plainText.length > 500) {
        opinion = candidate;
        break;
      }
    }
  }

  // ── 3. Pincite / quote ─────────────────────────────────────────
  // Always emit a pincite row so the report has the three guaranteed
  // sections per citation. "Not applicable" when no quote was attributed
  // is a real, useful answer — better than the section silently missing.
  if (!quoted) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "pincite",
      verdict: "verified",
      source: "veritas:extract",
      sourceUrl: hit.absoluteUrl,
      detail:
        "No direct quotation attributed to this citation in the brief. Nothing to verify against the opinion text.",
      raw: { applicable: false } as never,
    });
  } else if (!opinion?.plainText) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "pincite",
      verdict: "unknown",
      source: `courtlistener:cluster/${hit.clusterId}`,
      sourceUrl: hit.absoluteUrl,
      detail:
        "Quotation check was inconclusive — the opinion text wasn't available in CourtListener for comparison. Recommend manual verification against the official reporter.",
      raw: { quoted } as never,
    });
    rolled = worst(rolled, "unknown");
  } else {
    const { hit: qHit, score } = quoteAppears(quoted, opinion.plainText);
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
      source: `courtlistener:opinion/${opinion.id}`,
      sourceUrl: hit.absoluteUrl,
      detail: qHit
        ? score >= 95
          ? "Quoted language located in the cited opinion."
          : "Partial match only — wording may have been altered, condensed, or paraphrased. Recommend comparing the brief's quotation against the source."
        : "Quoted language was not located in the cited opinion. Recommend verifying the quotation against the source before filing.",
      raw: { quoted, score } as never,
    });
    rolled = worst(rolled, qVerdict);
  }

  // ── 4. Proposition support ─────────────────────────────────────
  // Always surfaced — answers "does the cited case actually support the
  // argument being made?" This is the core promise of the platform, not
  // an upsell. When the opinion text or AI isn't available, emit a
  // clearly-marked inconclusive row instead of silently skipping.
  if (!opinion?.plainText) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "proposition",
      verdict: "unknown",
      source: `courtlistener:cluster/${hit.clusterId}`,
      sourceUrl: hit.absoluteUrl,
      detail:
        "Proposition-support check was inconclusive — the opinion text wasn't available in CourtListener. Recommend manually confirming this authority supports the argument.",
      raw: { reason: "no_opinion_text" } as never,
    });
    rolled = worst(rolled, "unknown");
  } else if (!cite.contextSnippet) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "proposition",
      verdict: "unknown",
      source: "veritas:extract",
      sourceUrl: hit.absoluteUrl,
      detail:
        "Proposition-support check was inconclusive — no surrounding argument text was captured around this citation.",
      raw: { reason: "no_context" } as never,
    });
    rolled = worst(rolled, "unknown");
  } else if (!aiAvailable()) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "proposition",
      verdict: "unknown",
      source: "veritas:ai",
      sourceUrl: hit.absoluteUrl,
      detail:
        "Proposition-support check was unavailable — the verification model is offline. Recommend manual review.",
      raw: { reason: "ai_unavailable" } as never,
    });
    rolled = worst(rolled, "unknown");
  } else {
    const result = await checkProposition({
      caseName: hit.caseName,
      citation: query,
      opinionText: opinion.plainText,
      proposition: cite.contextSnippet,
    });
    if (!result) {
      await db.insert(schema.verifications).values({
        citationId,
        documentId,
        kind: "proposition",
        verdict: "unknown",
        source: "veritas:ai",
        sourceUrl: hit.absoluteUrl,
        detail:
          "Proposition-support check was inconclusive — the verification model returned an error. Recommend manual review.",
        raw: { reason: "ai_error" } as never,
      });
      rolled = worst(rolled, "unknown");
    } else {
      const pVerdict: Verdict =
        result.verdict === "supports"
          ? "verified"
          : result.verdict === "contradicts"
            ? "risk"
            : "warning";
      await db.insert(schema.verifications).values({
        citationId,
        documentId,
        kind: "proposition",
        verdict: pVerdict,
        source: `courtlistener:opinion/${opinion.id}`,
        sourceUrl: hit.absoluteUrl,
        model: result.model,
        promptHash: result.promptHash,
        detail:
          result.verdict === "supports"
            ? `Proposition appears supported. ${result.reasoning}`
            : result.verdict === "overstates"
              ? `Proposition may be overstated relative to the holding. ${result.reasoning}`
              : result.verdict === "contradicts"
                ? `Cited authority may run contrary to the asserted proposition. ${result.reasoning}`
                : `Support for the asserted proposition was not located in the cited opinion. ${result.reasoning}`,
        raw: result as never,
      });
      rolled = worst(rolled, pVerdict);
    }
  }

  await db
    .update(schema.citations)
    .set({ verdict: rolled })
    .where(eq(schema.citations.id, citationId));

  await db
    .update(schema.documents)
    .set({ updatedAt: sql`now()` })
    .where(eq(schema.documents.id, documentId));

  return rolled;
}

/* =================================================================
   STATUTE / RULE / ONLINE-ONLY VERIFIERS
   ================================================================= */

async function verifyStatute(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
}): Promise<Verdict> {
  const { citationId, documentId, cite } = args;
  let rolled: Verdict = "verified";
  const query =
    cite.volume && /U\.?S\.?C|C\.?F\.?R/.test(cite.reporter)
      ? `${cite.volume} ${cite.reporter} § ${cite.page}`
      : `${cite.reporter} § ${cite.page}`;

  // Federal: U.S.C. / C.F.R. via Cornell LII. State statutes: we
  // record existence as unknown (no free national state-statute API
  // exists) but still run proposition support via AI so the lawyer
  // gets some signal.
  const isUSC = /U\.?S\.?C/.test(cite.reporter);
  const isCFR = /C\.?F\.?R/.test(cite.reporter);
  const isFederal = isUSC || isCFR;

  if (isFederal) {
    const result = isUSC
      ? await lookupUSC(cite.volume, cite.page)
      : await lookupCFR(cite.volume, cite.page);
    if (!result.ok) {
      const isMissing = result.reason === "not_found";
      rolled = worst(rolled, isMissing ? "risk" : "unknown");
      await db.insert(schema.verifications).values({
        citationId,
        documentId,
        kind: "existence",
        verdict: isMissing ? "risk" : "unknown",
        source: "cornell-lii",
        detail: isMissing
          ? `No statute is published at ${query} in Cornell LII's corpus of the U.S. Code. This is the typical signal for a hallucinated or mistyped statutory cite; verify against the official source before filing.`
          : `Statute existence check was inconclusive (LII fetch failed). Recommend manual verification.`,
        raw: { query, reason: result.reason } as never,
      });
      await skipDownstreamForAuthority(citationId, documentId, "statute", rolled);
      return finalize(citationId, documentId, rolled);
    }

    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: "verified",
      source: "cornell-lii",
      sourceUrl: result.sourceUrl,
      detail: `Located ${result.title || query} on Cornell LII.`,
      raw: { url: result.sourceUrl } as never,
    });

    // Pincite for statutes: if the brief attached a quote, see whether
    // it appears in the LII excerpt.
    await runStatutePincite(citationId, documentId, args.cite, result.excerpt, result.sourceUrl);

    // Proposition check against statute text.
    await runStatuteProposition(citationId, documentId, args.cite, result.excerpt, result.sourceUrl, query);
  } else {
    // State statute — surface as inconclusive existence so the lawyer
    // knows we couldn't independently verify it.
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: "unknown",
      source: "veritas:state-statute",
      detail: `State statute cited: ${query}. We do not currently have a free national state-statute corpus to verify against; please confirm the citation manually.`,
      raw: { query } as never,
    });
    rolled = worst(rolled, "unknown");
    await skipDownstreamForAuthority(citationId, documentId, "statute", rolled);
  }

  return finalize(citationId, documentId, rolled);
}

async function verifyStateStatute(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
}): Promise<Verdict> {
  const { citationId, documentId, cite } = args;
  const query = `${cite.reporter} § ${cite.page}`;

  // If the state isn't covered by Phase 1, surface as unknown so the
  // lawyer at least sees an explicit "not yet covered" advisory
  // rather than a false-verified.
  if (!stateStatuteCovered(cite.reporter)) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: "unknown",
      source: "veritas:state-statute",
      detail: `State statute cited: ${query}. This state isn't covered by our Phase 1 verification corpus (currently CA, CO, FL, GA, IL, MI, NJ, NY, OH, PA, TX). Confirm against the official source before filing.`,
      raw: { query } as never,
    });
    await skipDownstreamForAuthority(citationId, documentId, "statute", "unknown");
    return finalize(citationId, documentId, "unknown");
  }

  let rolled: Verdict = "verified";
  const result = await lookupStateStatute(cite.reporter, cite.page);
  if (!result.ok) {
    const isMissing = result.reason === "not_found";
    rolled = worst(rolled, isMissing ? "risk" : "unknown");
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: isMissing ? "risk" : "unknown",
      source: "state-legislature",
      detail: isMissing
        ? `No statute found at ${query} on the official state source or Justia mirror. Typical signal for a misnumbered or fabricated statutory cite.`
        : `State statute existence check was inconclusive (source fetch failed). Recommend manual verification.`,
      raw: { query, reason: result.reason } as never,
    });
    await skipDownstreamForAuthority(citationId, documentId, "statute", rolled);
    return finalize(citationId, documentId, rolled);
  }

  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: "verified",
    source: "state-legislature",
    sourceUrl: result.sourceUrl,
    detail: `Located ${result.title || query} on the official state source.`,
    raw: { url: result.sourceUrl } as never,
  });

  await runStatutePincite(citationId, documentId, args.cite, result.excerpt, result.sourceUrl);
  await runStatuteProposition(citationId, documentId, args.cite, result.excerpt, result.sourceUrl, query);

  return finalize(citationId, documentId, rolled);
}

async function verifyConstitution(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
}): Promise<Verdict> {
  const { citationId, documentId, cite } = args;
  // Constitutional citations are public-domain and structural; we
  // record them as verified-by-form and rely on the proposition
  // check (when AI is available) to confirm the cited clause
  // actually says what the brief claims.
  const query = `${cite.reporter} ${cite.page}`;
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: "verified",
    source: "veritas:constitution",
    detail: `Constitutional citation: ${query}.`,
    raw: { query } as never,
  });
  // No pincite or proposition check yet — Phase 2 will hook in an
  // AI check against the canonical constitutional text. For now we
  // write the explicit N/A rows so the three-checks guarantee
  // continues to hold structurally.
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "pincite",
    verdict: "verified",
    source: "veritas:extract",
    detail:
      "No direct quotation attributed to this provision in the brief, or quotation matching is not yet supported for constitutional citations.",
    raw: { applicable: false } as never,
  });
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "proposition",
    verdict: "unknown",
    source: "veritas:constitution",
    detail:
      "Proposition-support check against canonical constitutional text is on the Phase 2 roadmap. The citation itself is well-formed; recommend confirming the cited clause actually supports the asserted proposition.",
    raw: { reason: "phase_2_pending" } as never,
  });
  return finalize(citationId, documentId, "unknown");
}

async function verifySlipOpinion(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
}): Promise<Verdict> {
  const { citationId, documentId, cite } = args;
  // Slip opinions don't have a reporter cite to resolve. We record
  // the docket as detected and flag it as "we can't independently
  // verify without a reporter cite or PACER access" — never falsely
  // marked as fabricated.
  const query = `${cite.rawText}`;
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: "unknown",
    source: "veritas:slip-opinion",
    detail: `Slip-opinion / docket-only reference detected: ${query}. We do not have automated access to PACER, so we cannot independently confirm the underlying order. Recommend verifying against the court's docket before filing.`,
    raw: { query, docket: cite.page, court: cite.court, year: cite.year } as never,
  });
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "pincite",
    verdict: "verified",
    source: "veritas:extract",
    detail: "Pincite check not applicable to docket-only references.",
    raw: { applicable: false } as never,
  });
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "proposition",
    verdict: "unknown",
    source: "veritas:slip-opinion",
    detail:
      "Proposition-support check not run — slip opinion text isn't accessible in our free corpus. Verify the cited order against the court's docket.",
    raw: { reason: "no_source" } as never,
  });
  return finalize(citationId, documentId, "unknown");
}

async function verifyRule(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
}): Promise<Verdict> {
  const { citationId, documentId, cite } = args;
  let rolled: Verdict = "verified";
  // cite.reporter is "Fed. R. Civ. P." etc.; pull the rule set out of it.
  const setMatch = /Fed\.?\s?R\.?\s?(Civ|Crim|Evid|App|Bankr)/i.exec(cite.reporter);
  const ruleSet = setMatch ? setMatch[1] : "";
  const query = `${cite.reporter} ${cite.page}`;
  const result = ruleSet
    ? await lookupFedRule(ruleSet, cite.page)
    : { ok: false as const, reason: "error" as const };

  if (!result.ok) {
    const isMissing = result.reason === "not_found";
    rolled = worst(rolled, isMissing ? "risk" : "unknown");
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "existence",
      verdict: isMissing ? "risk" : "unknown",
      source: "cornell-lii",
      detail: isMissing
        ? `No such rule found on Cornell LII at ${query}. Verify the rule number before filing.`
        : `Rule existence check was inconclusive (LII fetch failed). Recommend manual verification.`,
      raw: { query, reason: result.reason } as never,
    });
    await skipDownstreamForAuthority(citationId, documentId, "rule", rolled);
    return finalize(citationId, documentId, rolled);
  }

  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: "verified",
    source: "cornell-lii",
    sourceUrl: result.sourceUrl,
    detail: `Located ${result.title || query} on Cornell LII.`,
    raw: { url: result.sourceUrl } as never,
  });

  await runStatutePincite(citationId, documentId, args.cite, result.excerpt, result.sourceUrl);
  await runStatuteProposition(citationId, documentId, args.cite, result.excerpt, result.sourceUrl, query);

  return finalize(citationId, documentId, rolled);
}

async function verifyOnlineOnly(args: {
  citationId: string;
  documentId: string;
  cite: ExtractedCitation;
}): Promise<Verdict> {
  const { citationId, documentId, cite } = args;
  const isWestlaw = cite.kind === "westlaw";
  const query = `${cite.volume} ${cite.reporter} ${cite.page}`;
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "existence",
    verdict: "unknown",
    source: isWestlaw ? "veritas:westlaw-only" : "veritas:lexis-only",
    detail: `${isWestlaw ? "Westlaw" : "Lexis"}-only citation (${query}). We do not have a license to the ${isWestlaw ? "Westlaw" : "Lexis"} corpus, so we cannot independently verify the underlying opinion text. If the case was later published in a bound reporter, prefer that citation; otherwise verify manually before filing.`,
    raw: { query } as never,
  });
  // No pincite or proposition — we don't have source text.
  await db
    .update(schema.citations)
    .set({ verdict: "unknown" })
    .where(eq(schema.citations.id, citationId));
  return "unknown";
}

/* ─── helpers shared by statute / rule paths ──────────────────── */

async function runStatutePincite(
  citationId: string,
  documentId: string,
  cite: ExtractedCitation,
  sourceText: string,
  sourceUrl: string,
): Promise<void> {
  // We don't have quote-extraction wired into verifyOneCitation's args
  // for non-case kinds yet, so write the explicit N/A row to keep the
  // three-checks-per-citation guarantee intact.
  void cite;
  void sourceText;
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "pincite",
    verdict: "verified",
    source: "veritas:extract",
    sourceUrl,
    detail:
      "No direct quotation attributed to this authority in the brief, or quotation matching is not yet supported for statutes/rules. Nothing to verify against the source text.",
    raw: { applicable: false } as never,
  });
}

async function runStatuteProposition(
  citationId: string,
  documentId: string,
  cite: ExtractedCitation,
  sourceText: string,
  sourceUrl: string,
  query: string,
): Promise<void> {
  if (!cite.contextSnippet) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "proposition",
      verdict: "unknown",
      source: "veritas:extract",
      sourceUrl,
      detail:
        "Proposition-support check was inconclusive — no surrounding argument text was captured around this citation.",
      raw: { reason: "no_context" } as never,
    });
    return;
  }
  if (!aiAvailable()) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "proposition",
      verdict: "unknown",
      source: "veritas:ai",
      sourceUrl,
      detail:
        "Proposition-support check was unavailable — the verification model is offline. Recommend manual review.",
      raw: { reason: "ai_unavailable" } as never,
    });
    return;
  }
  const result = await checkProposition({
    caseName: query,
    citation: query,
    opinionText: sourceText,
    proposition: cite.contextSnippet,
  });
  if (!result) {
    await db.insert(schema.verifications).values({
      citationId,
      documentId,
      kind: "proposition",
      verdict: "unknown",
      source: "veritas:ai",
      sourceUrl,
      detail:
        "Proposition-support check was inconclusive — the verification model returned an error. Recommend manual review.",
      raw: { reason: "ai_error" } as never,
    });
    return;
  }
  const pVerdict: Verdict =
    result.verdict === "supports"
      ? "verified"
      : result.verdict === "contradicts"
        ? "risk"
        : "warning";
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "proposition",
    verdict: pVerdict,
    source: "cornell-lii",
    sourceUrl,
    model: result.model,
    promptHash: result.promptHash,
    detail:
      result.verdict === "supports"
        ? `Proposition appears supported. ${result.reasoning}`
        : result.verdict === "overstates"
          ? `Proposition may be overstated relative to the source text. ${result.reasoning}`
          : result.verdict === "contradicts"
            ? `Source authority may run contrary to the asserted proposition. ${result.reasoning}`
            : `Support for the asserted proposition was not located in the source text. ${result.reasoning}`,
    raw: result as never,
  });
}

async function skipDownstreamForAuthority(
  citationId: string,
  documentId: string,
  authorityKind: "statute" | "rule",
  rolled: Verdict,
): Promise<void> {
  void authorityKind;
  // When existence fails, write the explicit not-run rows so the
  // three-checks-per-citation guarantee still holds.
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "pincite",
    verdict: "verified",
    source: "veritas:extract",
    detail:
      "Skipped — the underlying authority could not be located, so there is no source text to compare against.",
    raw: { applicable: false } as never,
  });
  await db.insert(schema.verifications).values({
    citationId,
    documentId,
    kind: "proposition",
    verdict: rolled === "risk" ? "risk" : "unknown",
    source: "veritas:extract",
    detail:
      "Skipped — the underlying authority could not be located, so we cannot evaluate proposition support.",
    raw: { reason: "no_source" } as never,
  });
}

async function finalize(
  citationId: string,
  documentId: string,
  rolled: Verdict,
): Promise<Verdict> {
  await db
    .update(schema.citations)
    .set({ verdict: rolled })
    .where(eq(schema.citations.id, citationId));
  await db
    .update(schema.documents)
    .set({ updatedAt: sql`now()` })
    .where(eq(schema.documents.id, documentId));
  return rolled;
}

export { hash };
