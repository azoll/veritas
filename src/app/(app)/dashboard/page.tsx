import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { getScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { VerdictPill } from "@/components/ui/Verdict";
import { EmptyScope } from "@/components/EmptyScope";

export const dynamic = "force-dynamic";

function rollupVerdict(d: {
  riskCount: number;
  warningCount: number;
  verifiedCount: number;
  status: string;
}): "verified" | "warning" | "risk" | "unknown" {
  if (d.status !== "ready") return "unknown";
  if (d.riskCount > 0) return "risk";
  if (d.warningCount > 0) return "warning";
  return "verified";
}

export default async function DashboardPage() {
  const scope = await getScope();
  if (!scope) return <EmptyScope />;

  const docs = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.firmId, scope.firmId))
    .orderBy(desc(schema.documents.createdAt))
    .limit(50);

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "64px 40px", width: "100%" }}>
      <div style={{ marginBottom: 56 }}>
        <div className="v-eyebrow">Filings · Verification Queue</div>
        <h1
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-serif)",
            fontSize: 64,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Filings
        </h1>
      </div>

      <UploadDropzone />

      <div style={{ marginTop: 72 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            Recent
          </h2>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {docs.length} filing{docs.length === 1 ? "" : "s"}
          </span>
        </div>

        {docs.length === 0 ? (
          <div
            style={{
              border: "1px solid var(--hair)",
              padding: "64px 24px",
              textAlign: "center",
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            No filings yet. Upload a brief above to begin audit.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--hair)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 120px 120px 140px",
                gap: 16,
                padding: "12px 20px",
                background: "var(--bg-raised)",
                borderBottom: "1px solid var(--hair)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}
            >
              <div>Filing</div>
              <div style={{ textAlign: "right" }}>Citations</div>
              <div style={{ textAlign: "right" }}>Risk</div>
              <div style={{ textAlign: "right" }}>Score</div>
              <div>Status</div>
            </div>
            {docs.map((d) => {
              const v = rollupVerdict(d);
              return (
                <Link
                  key={d.id}
                  href={`/documents/${d.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 120px 120px 140px",
                    gap: 16,
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--hair)",
                    textDecoration: "none",
                    color: "var(--fg)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, color: "var(--fg)" }}>
                      {d.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--fg-3)",
                        fontFamily: "var(--font-mono)",
                        marginTop: 2,
                      }}
                    >
                      {d.filename}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--fg-2)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {d.citationCount}
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <span style={{ color: "var(--critical)" }}>{d.riskCount}</span>
                    <span style={{ color: "var(--fg-3)" }}> · </span>
                    <span style={{ color: "var(--amber)" }}>{d.warningCount}</span>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {d.confidenceScore != null
                      ? `${100 - d.confidenceScore}`
                      : "—"}
                  </div>
                  <div>
                    <VerdictPill verdict={v} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
