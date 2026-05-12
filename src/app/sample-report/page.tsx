import Link from "next/link";
import type { Metadata } from "next";
import type { Citation, Verification, Quote } from "@/lib/db/schema";
import { CitationCard } from "../(app)/documents/[id]/CitationCard";
import { VerdictPill } from "@/components/ui/Verdict";
import { Seal, VWordmark } from "@/components/brand/Seal";

export const metadata: Metadata = {
  title: "Sample Verification Report · Veritas",
  description:
    "A representative Veritas report run against a four-citation discovery motion. Shows what existence, quotation, and proposition-support checks look like end-to-end.",
};

/**
 * Public, marketing-facing sample report. Renders identically to the
 * authenticated /documents/[id] page, but with curated data baked in
 * so prospects can see exactly what the platform produces without
 * uploading anything. Data comes from a real test scan we ran on a
 * brief with four planted citation issues (one fabricated, one with
 * a hallucinated quote, one cited for an unrelated proposition, one
 * fully verified).
 */

const SAMPLE_DOC = {
  title: "Motion to Compel Discovery (sample brief)",
  filename: "motion-to-compel.pdf",
  citationCount: 4,
  verifiedCount: 1,
  warningCount: 1,
  riskCount: 2,
  confidenceScore: 38,
};

const SAMPLE_CITATIONS: Citation[] = [
  {
    id: "sample-halverson",
    documentId: "sample",
    firmId: "sample",
    kind: "case",
    rawText: "Halverson v. Pacific Western Mutual, 547 F.4th 1182, 1191 (9th Cir. 2024)",
    normalized: "547 F.4th 1182, 1191",
    caseName: "Halverson v. Pacific Western Mutual,",
    reporter: "F.4th",
    volume: "547",
    page: "1182",
    pinpointPage: "1191",
    court: "9th Cir.",
    year: 2024,
    startOffset: 1384,
    endOffset: 1457,
    contextSnippet:
      "recent and binding decision, held that \"blanket relevance objections, lodged without substantive particularization of the burden alleged, are insufficient as a matter of law to defeat a properly-served Rule 34 request.\" Halverson v. Pacific Western Mutual, 547 F.4th 1182, 1191 (9th Cir. 2024). Halverson is directly on point: Defendant's responses to Requests 14-28 contain only boilerplate objections that fail any test of particularity.",
    verdict: "risk",
    notes: "No opinion published at this citation — possible fabrication.",
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "sample-upjohn",
    documentId: "sample",
    firmId: "sample",
    kind: "case",
    rawText: "Upjohn Co. v. United States, 449 U.S. 383, 392 (1981)",
    normalized: "449 U.S. 383, 392",
    caseName: "Upjohn Co. v. United States,",
    reporter: "U.S.",
    volume: "449",
    page: "383",
    pinpointPage: "392",
    court: null,
    year: 1981,
    startOffset: 2000,
    endOffset: 2050,
    contextSnippet:
      "willfully withholds responsive documents. In Upjohn, the Court emphasized that \"discovery sanctions must be applied severely upon any showing of willful evasion, with no requirement that the moving party demonstrate prejudice.\" Upjohn Co. v. United States, 449 U.S. 383, 392 (1981). Defendant's conduct here satisfies the Upjohn standard and warrants sanctions accordingly.",
    verdict: "risk",
    notes: null,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "sample-daubert",
    documentId: "sample",
    firmId: "sample",
    kind: "case",
    rawText: "Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579, 596 (1993)",
    normalized: "509 U.S. 579, 596",
    caseName: "See Daubert v. Merrell Dow Pharmaceuticals, Inc.,",
    reporter: "U.S.",
    volume: "509",
    page: "579",
    pinpointPage: "596",
    court: null,
    year: 1993,
    startOffset: 2600,
    endOffset: 2680,
    contextSnippet:
      "Defendant's argument that production would be disproportionate ignores the Supreme Court's clear instruction that discovery requests must be presumed reasonable absent an affirmative showing of bad faith by the responding party. See Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579, 596 (1993).",
    verdict: "warning",
    notes: null,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "sample-hickman",
    documentId: "sample",
    firmId: "sample",
    kind: "case",
    rawText: "Hickman v. Taylor, 329 U.S. 495, 507 (1947)",
    normalized: "329 U.S. 495, 507",
    caseName: "Hickman v. Taylor,",
    reporter: "U.S.",
    volume: "329",
    page: "495",
    pinpointPage: "507",
    court: null,
    year: 1947,
    startOffset: 812,
    endOffset: 855,
    contextSnippet:
      "As the Supreme Court explained more than seventy years ago, \"Mutual knowledge of all the relevant facts gathered by both parties is essential to proper litigation.\" Hickman v. Taylor, 329 U.S. 495, 507 (1947).",
    verdict: "verified",
    notes: null,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
];

const SAMPLE_VERIFICATIONS: Verification[] = [
  // Halverson — fabricated
  {
    id: "v-halverson-existence",
    citationId: "sample-halverson",
    documentId: "sample",
    kind: "existence",
    verdict: "risk",
    source: "courtlistener:citation-lookup",
    sourceUrl: null,
    detail:
      "No opinion is published at 547 F.4th 1182 in CourtListener's corpus. This is the typical signal for a hallucinated or mistyped citation; recommend verifying against the official reporter before filing.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  // Upjohn — real cite, fake quote, wrong holding
  {
    id: "v-upjohn-existence",
    citationId: "sample-upjohn",
    documentId: "sample",
    kind: "existence",
    verdict: "verified",
    source: "courtlistener:cluster/110374",
    sourceUrl: "https://www.courtlistener.com/opinion/110374/upjohn-co-v-united-states/",
    detail: "Located Upjohn Co. v. United States at 449 U.S. 383.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-upjohn-treatment",
    citationId: "sample-upjohn",
    documentId: "sample",
    kind: "treatment",
    verdict: "verified",
    source: "courtlistener:cluster/110374",
    sourceUrl: "https://www.courtlistener.com/opinion/110374/upjohn-co-v-united-states/",
    detail: "Precedential status: Published. Cited by 3,220 opinions.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-upjohn-pincite",
    citationId: "sample-upjohn",
    documentId: "sample",
    kind: "pincite",
    verdict: "risk",
    source: "courtlistener:opinion/110374",
    sourceUrl: "https://www.courtlistener.com/opinion/110374/upjohn-co-v-united-states/",
    detail:
      "Quoted language was not located in the cited opinion. Recommend verifying the quotation against the source before filing.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-upjohn-proposition",
    citationId: "sample-upjohn",
    documentId: "sample",
    kind: "proposition",
    verdict: "risk",
    source: "courtlistener:opinion/110374",
    sourceUrl: "https://www.courtlistener.com/opinion/110374/upjohn-co-v-united-states/",
    detail:
      "Cited authority may run contrary to the asserted proposition. Upjohn Co. v. United States is the leading Supreme Court case on the scope of the attorney-client privilege in the corporate context — specifically, the rule that internal communications between corporate counsel and lower-level employees can be privileged. The opinion does not address discovery sanctions, willful evasion, or the prejudice requirement. Recommend re-verifying the proposition this citation is offered to support.",
    model: "anthropic/claude-sonnet-4.6",
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  // Daubert — real, no quote, but cited for an unrelated proposition
  {
    id: "v-daubert-existence",
    citationId: "sample-daubert",
    documentId: "sample",
    kind: "existence",
    verdict: "verified",
    source: "courtlistener:citation-lookup",
    sourceUrl: "https://www.courtlistener.com/opinion/112903/daubert-v-merrell-dow-pharmaceuticals-inc/",
    detail: "Located Daubert v. Merrell Dow Pharmaceuticals, Inc. at 509 U.S. 579.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-daubert-treatment",
    citationId: "sample-daubert",
    documentId: "sample",
    kind: "treatment",
    verdict: "verified",
    source: "courtlistener:cluster/112903",
    sourceUrl: "https://www.courtlistener.com/opinion/112903/daubert-v-merrell-dow-pharmaceuticals-inc/",
    detail: "Precedential status: Published. Cited by 21,299 opinions.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-daubert-pincite",
    citationId: "sample-daubert",
    documentId: "sample",
    kind: "pincite",
    verdict: "verified",
    source: "veritas:extract",
    sourceUrl: null,
    detail:
      "No direct quotation attributed to this citation in the brief. Nothing to verify against the opinion text.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-daubert-proposition",
    citationId: "sample-daubert",
    documentId: "sample",
    kind: "proposition",
    verdict: "warning",
    source: "courtlistener:opinion/112903",
    sourceUrl: "https://www.courtlistener.com/opinion/112903/daubert-v-merrell-dow-pharmaceuticals-inc/",
    detail:
      "Support for the asserted proposition was not located in the cited opinion. Daubert v. Merrell Dow Pharmaceuticals, Inc. addresses the standard for admitting expert scientific testimony under Federal Rule of Evidence 702 — it does not establish a presumption of reasonableness for discovery requests. Recommend substituting authority that actually addresses the discovery-proportionality standard.",
    model: "anthropic/claude-sonnet-4.6",
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  // Hickman — fully verified end-to-end
  {
    id: "v-hickman-existence",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "existence",
    verdict: "verified",
    source: "courtlistener:citation-lookup",
    sourceUrl: "https://www.courtlistener.com/opinion/103693/hickman-v-taylor/",
    detail: "Located Hickman v. Taylor at 329 U.S. 495.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-hickman-treatment",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "treatment",
    verdict: "verified",
    source: "courtlistener:cluster/103693",
    sourceUrl: "https://www.courtlistener.com/opinion/103693/hickman-v-taylor/",
    detail: "Precedential status: Published. Cited by 4,971 opinions.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-hickman-pincite",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "pincite",
    verdict: "verified",
    source: "courtlistener:opinion/103693",
    sourceUrl: "https://www.courtlistener.com/opinion/103693/hickman-v-taylor/",
    detail: "Quoted language located in the cited opinion.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
  {
    id: "v-hickman-proposition",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "proposition",
    verdict: "verified",
    source: "courtlistener:opinion/103693",
    sourceUrl: "https://www.courtlistener.com/opinion/103693/hickman-v-taylor/",
    detail:
      "Proposition appears supported. The opinion explicitly states the quoted language, and the surrounding holding establishes the foundational principle of liberal discovery the brief is invoking. This citation is being used correctly.",
    model: "anthropic/claude-sonnet-4.6",
    promptHash: null,
    raw: null as never,
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
];

const SAMPLE_QUOTES: Quote[] = [
  {
    id: "q-hickman",
    citationId: "sample-hickman",
    quotedText:
      "Mutual knowledge of all the relevant facts gathered by both parties is essential to proper litigation.",
    sourceText:
      "Mutual knowledge of all the relevant facts gathered by both parties is essential to proper litigation.",
    matchScore: 100,
    verdict: "verified",
    createdAt: new Date("2026-05-13T00:00:00Z"),
  },
];

const SEV: Record<string, number> = { risk: 0, warning: 1, unknown: 2, verified: 3 };

export default function SampleReportPage() {
  const doc = SAMPLE_DOC;
  const sorted = [...SAMPLE_CITATIONS].sort(
    (a, b) => SEV[a.verdict] - SEV[b.verdict],
  );
  const verifsByCit = new Map<string, Verification[]>();
  for (const v of SAMPLE_VERIFICATIONS) {
    const arr = verifsByCit.get(v.citationId) ?? [];
    arr.push(v);
    verifsByCit.set(v.citationId, arr);
  }
  const quotesByCit = new Map<string, Quote[]>();
  for (const q of SAMPLE_QUOTES) {
    const arr = quotesByCit.get(q.citationId) ?? [];
    arr.push(q);
    quotesByCit.set(q.citationId, arr);
  }

  const overall = "risk" as const;
  const riskScore = 100 - doc.confidenceScore;

  return (
    <div>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--obsidian)",
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            height: 64,
            padding: "0 clamp(16px, 4vw, 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "var(--fg)",
              textDecoration: "none",
            }}
          >
            <Seal size={22} />
            <VWordmark />
          </Link>
          <Link href="/scan" className="v-btn v-btn--primary v-btn--sm">
            Try it free
          </Link>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(40px, 8vw, 48px) clamp(16px, 4vw, 40px)",
        }}
      >
        <div
          style={{
            border: "1px solid var(--hair-strong)",
            background: "var(--bg-raised)",
            padding: "clamp(16px, 3vw, 20px) clamp(20px, 4vw, 28px)",
            marginBottom: 40,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div
              className="v-eyebrow"
              style={{ marginBottom: 6, color: "var(--gold, var(--accent))" }}
            >
              Sample report
            </div>
            <div
              style={{ fontSize: 14, color: "var(--fg-2)", maxWidth: 560 }}
            >
              This is a real Veritas report on a four-citation discovery
              motion. Two citations are fabricated or misattributed, one is
              cited for an unrelated proposition, one is verified end-to-end.
              Try your own filing to see your actual results.
            </div>
          </div>
          <Link
            href="/scan"
            className="v-btn v-btn--primary v-btn--sm"
            style={{ flexShrink: 0 }}
          >
            Run on my filing
          </Link>
        </div>

        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>

        <div
          style={{
            marginTop: 16,
            paddingBottom: 40,
            borderBottom: "1px solid var(--hair)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 48,
            alignItems: "end",
          }}
        >
          <div>
            <div className="v-eyebrow">Verification Report</div>
            <h1
              style={{
                margin: "12px 0 0",
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(2rem, 5.5vw, 3.5rem)",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {doc.title}
            </h1>
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-3)",
              }}
            >
              {doc.filename}
            </div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <VerdictPill verdict={overall} />
              <a
                href="/api/sample-report/certificate"
                target="_blank"
                rel="noopener noreferrer"
                className="v-btn v-btn--secondary v-btn--sm"
              >
                Download Verification Certificate
              </a>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              background: "var(--hair)",
              border: "1px solid var(--hair)",
            }}
          >
            <Stat label="Risk score" value={String(riskScore)} />
            <Stat label="Citations" value={String(doc.citationCount)} />
            <Stat
              label="Not located"
              value={String(doc.riskCount)}
              tone="critical"
            />
            <Stat
              label="Review recommended"
              value={String(doc.warningCount)}
              tone="amber"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            padding: "14px 18px",
            border: "1px solid var(--hair)",
            background: "var(--bg-raised)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
              paddingTop: 2,
              flexShrink: 0,
            }}
          >
            Reviewer of record
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fg-2)" }}>
            Veritas surfaces candidates for attorney review. Findings are not
            legal conclusions. The decision to rely on any authority — and
            responsibility for every citation in a filing — remains with the
            filing attorney.
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h2
            style={{
              margin: "0 0 24px",
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            Citations · sorted by severity
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((c) => (
              <CitationCard
                key={c.id}
                citation={c}
                verifications={verifsByCit.get(c.id) ?? []}
                quotes={quotesByCit.get(c.id) ?? []}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 64,
            padding: "clamp(32px, 6vw, 48px) clamp(24px, 5vw, 40px)",
            border: "1px solid var(--hair-strong)",
            background: "var(--bg-raised)",
            textAlign: "center",
          }}
        >
          <div className="v-eyebrow" style={{ marginBottom: 12 }}>
            Run it on your filing
          </div>
          <h3
            style={{
              margin: "0 0 16px",
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            See your own report in under a minute.
          </h3>
          <p
            style={{
              margin: "0 auto 28px",
              maxWidth: 540,
              color: "var(--fg-2)",
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            Upload a brief, motion, or memo. We&apos;ll check every cited
            authority against primary reporters, validate quoted language,
            and stress-test whether each citation actually supports the
            argument it&apos;s offered for.
          </p>
          <Link href="/scan" className="v-btn v-btn--primary v-btn--lg">
            Try it free
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "critical" | "amber";
}) {
  const color =
    tone === "critical"
      ? "var(--critical)"
      : tone === "amber"
        ? "var(--amber)"
        : "var(--fg)";
  return (
    <div style={{ background: "var(--bg-raised)", padding: "14px 16px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
          fontWeight: 400,
          letterSpacing: "-0.02em",
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}
