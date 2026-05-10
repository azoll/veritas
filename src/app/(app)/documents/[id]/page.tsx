import Link from "next/link";
import { and, eq, inArray, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { VerdictPill } from "@/components/ui/Verdict";
import { CitationCard } from "./CitationCard";
import { EmptyScope } from "@/components/EmptyScope";

export const dynamic = "force-dynamic";

const SEV: Record<string, number> = { risk: 0, warning: 1, unknown: 2, verified: 3 };

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await getScope();
  if (!scope) return <EmptyScope />;

  const { id } = await params;

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.id, id),
        eq(schema.documents.firmId, scope.firmId),
      ),
    );
  if (!doc) notFound();

  const citations = await db
    .select()
    .from(schema.citations)
    .where(eq(schema.citations.documentId, id))
    .orderBy(asc(schema.citations.startOffset));

  const verifications = citations.length
    ? await db
        .select()
        .from(schema.verifications)
        .where(
          inArray(
            schema.verifications.citationId,
            citations.map((c) => c.id),
          ),
        )
    : [];

  const quotes = citations.length
    ? await db
        .select()
        .from(schema.quotes)
        .where(
          inArray(
            schema.quotes.citationId,
            citations.map((c) => c.id),
          ),
        )
    : [];

  const sorted = [...citations].sort((a, b) => SEV[a.verdict] - SEV[b.verdict]);

  const verifsByCit = new Map<string, typeof verifications>();
  for (const v of verifications) {
    const arr = verifsByCit.get(v.citationId) ?? [];
    arr.push(v);
    verifsByCit.set(v.citationId, arr);
  }
  const quotesByCit = new Map<string, typeof quotes>();
  for (const q of quotes) {
    const arr = quotesByCit.get(q.citationId) ?? [];
    arr.push(q);
    quotesByCit.set(q.citationId, arr);
  }

  const overall =
    doc.status !== "ready"
      ? "unknown"
      : doc.riskCount > 0
        ? "risk"
        : doc.warningCount > 0
          ? "warning"
          : "verified";

  // Risk score: lower = safer. Inverted from stored "confidence".
  const riskScore =
    doc.confidenceScore != null ? 100 - doc.confidenceScore : null;

  return (
    <div
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "48px 40px",
        width: "100%",
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
          textDecoration: "none",
        }}
      >
        ← Filings
      </Link>

      <div
        style={{
          marginTop: 16,
          paddingBottom: 40,
          borderBottom: "1px solid var(--hair)",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
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
              fontSize: 56,
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
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <VerdictPill verdict={overall as "verified" | "warning" | "risk" | "unknown"} />
            {doc.status !== "ready" && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--fg-2)",
                }}
              >
                {doc.status}
                {doc.error ? ` · ${doc.error}` : ""}
              </span>
            )}
            <Link
              href={`/api/documents/${doc.id}/report`}
              target="_blank"
              className="v-btn v-btn--secondary v-btn--sm"
              style={{ marginLeft: "auto" }}
            >
              Generate risk report
            </Link>
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
          <Stat label="Risk score" value={riskScore != null ? String(riskScore) : "—"} tone="ink" />
          <Stat label="Citations" value={String(doc.citationCount)} tone="ink" />
          <Stat label="Fabricated" value={String(doc.riskCount)} tone="critical" />
          <Stat label="Unsupported" value={String(doc.warningCount)} tone="amber" />
        </div>
      </div>

      <div style={{ marginTop: 56 }}>
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

        {sorted.length === 0 && doc.status === "ready" && (
          <div
            style={{
              border: "1px solid var(--hair)",
              padding: "48px 16px",
              textAlign: "center",
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            No citations were detected in this filing.
          </div>
        )}
        {doc.status !== "ready" && doc.status !== "failed" && (
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: "1px solid var(--hair)",
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--fg-2)",
              background: "var(--bg-raised)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, var(--courtroom) 50%, transparent)",
                animation: "vScan 2.4s linear infinite",
              }}
            />
            Audit running · refresh in a moment.
          </div>
        )}

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
  tone: "ink" | "critical" | "amber" | "verified";
}) {
  const color =
    tone === "critical"
      ? "var(--critical)"
      : tone === "amber"
        ? "var(--amber)"
        : tone === "verified"
          ? "var(--verified)"
          : "var(--fg)";
  return (
    <div style={{ background: "var(--bg-raised)", padding: "16px 18px" }}>
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
          marginTop: 8,
          fontFamily: "var(--font-serif)",
          fontSize: 36,
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
