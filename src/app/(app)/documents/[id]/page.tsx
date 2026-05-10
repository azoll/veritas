import Link from "next/link";
import { and, eq, inArray, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { VerdictPill } from "@/components/ui/Verdict";
import { CitationCard } from "./CitationCard";
import { EmptyScope } from "@/components/EmptyScope";

export const dynamic = "force-dynamic";

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
      and(eq(schema.documents.id, id), eq(schema.documents.firmId, scope.firmId)),
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

  // Sort by severity for triage
  const sevRank = { risk: 0, warning: 1, unknown: 2, verified: 3 } as const;
  const sorted = [...citations].sort(
    (a, b) => sevRank[a.verdict] - sevRank[b.verdict],
  );

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

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="text-xs uppercase tracking-[0.2em] text-muted hover:text-ink"
      >
        ← Documents
      </Link>

      {/* Header */}
      <div className="mt-4 grid grid-cols-1 gap-8 border-b hairline pb-10 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="text-xs uppercase tracking-[0.25em] text-gold-2">
            Verification Report
          </div>
          <h1 className="mt-2 font-display text-4xl">{doc.title}</h1>
          <div className="mt-2 text-sm text-muted">{doc.filename}</div>
          <div className="mt-4">
            <VerdictPill verdict={overall as "verified" | "warning" | "risk" | "unknown"} />
            {doc.status !== "ready" && (
              <span className="ml-3 text-sm text-muted">
                Status: {doc.status}
                {doc.error ? ` — ${doc.error}` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <Stat label="Confidence" value={doc.confidenceScore != null ? `${doc.confidenceScore}%` : "—"} />
          <Stat label="Citations" value={String(doc.citationCount)} />
          <div className="flex gap-3">
            <Stat label="Risk" value={String(doc.riskCount)} tone="risk" />
            <Stat label="Warn" value={String(doc.warningCount)} tone="warn" />
            <Stat label="OK" value={String(doc.verifiedCount)} tone="verified" />
          </div>
        </div>
      </div>

      {/* Citation review list */}
      <div className="mt-10">
        <h2 className="mb-6 font-display text-2xl">Citations · sorted by risk</h2>

        {sorted.length === 0 && doc.status === "ready" && (
          <div className="rounded-sm border hairline px-6 py-12 text-center text-muted">
            No citations were detected in this document.
          </div>
        )}
        {doc.status !== "ready" && doc.status !== "failed" && (
          <div className="rounded-sm border hairline bg-paper-2 px-6 py-8 text-center text-muted">
            Verification in progress — refresh in a moment.
          </div>
        )}

        <div className="space-y-4">
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
  tone?: "verified" | "warn" | "risk";
}) {
  const toneClass =
    tone === "risk"
      ? "text-risk"
      : tone === "warn"
        ? "text-warn"
        : tone === "verified"
          ? "text-verified"
          : "text-ink";
  return (
    <div className="rounded-sm border hairline bg-paper px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
