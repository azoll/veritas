"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VerdictPill } from "@/components/ui/Verdict";
import { EmailGate } from "./EmailGate";

type Doc = {
  id: string;
  title: string;
  filename: string;
  status: string;
  citationCount: number;
  verifiedCount: number;
  warningCount: number;
  riskCount: number;
  confidenceScore: number | null;
  expiresAt: string | null;
};

type Citation = {
  id: string;
  caseName: string | null;
  normalized: string | null;
  year: number | null;
  verdict: "verified" | "warning" | "risk" | "unknown";
  contextSnippet: string | null;
};

type Verification = {
  id: string;
  citationId: string;
  kind: string;
  verdict: "verified" | "warning" | "risk" | "unknown";
  detail: string | null;
  sourceUrl: string | null;
};

function readLeadCookie(documentId: string): boolean {
  if (typeof document === "undefined") return false;
  const key = `v_lead_${documentId}=`;
  return document.cookie.split("; ").some((c) => c.startsWith(key));
}

export function TrialResult({ documentId }: { documentId: string }) {
  const [data, setData] = useState<{
    document: Doc;
    citations: Citation[];
    verifications: Verification[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(readLeadCookie(documentId));
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const r = await fetch(`/api/trial/${documentId}`);
        if (!r.ok) throw new Error(`(${r.status})`);
        const j = await r.json();
        if (cancelled) return;
        setData(j);
        if (j.document.status !== "ready" && j.document.status !== "failed") {
          timer = setTimeout(tick, 2000);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [documentId]);

  if (error) {
    return (
      <div
        style={{
          padding: "16px 20px",
          border: "1px solid var(--critical)",
          color: "var(--critical)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        Failed to load trial result: {error}
      </div>
    );
  }
  if (!data) {
    return <Skeleton />;
  }

  const { document: doc, citations, verifications } = data;

  // While the audit is still running, show the live progress; defer the
  // email gate until the result actually exists to be shown.
  const auditDone = doc.status === "ready" || doc.status === "failed";
  if (auditDone && !unlocked) {
    return <EmailGate documentId={doc.id} onUnlock={() => setUnlocked(true)} />;
  }
  const verifsByCit = new Map<string, Verification[]>();
  for (const v of verifications) {
    const arr = verifsByCit.get(v.citationId) ?? [];
    arr.push(v);
    verifsByCit.set(v.citationId, arr);
  }

  const sev = { risk: 0, warning: 1, unknown: 2, verified: 3 } as const;
  const sorted = [...citations].sort((a, b) => sev[a.verdict] - sev[b.verdict]);
  const overall =
    doc.status !== "ready"
      ? "unknown"
      : doc.riskCount > 0
        ? "risk"
        : doc.warningCount > 0
          ? "warning"
          : "verified";
  const riskScore =
    doc.confidenceScore != null ? 100 - doc.confidenceScore : null;
  const running = doc.status !== "ready" && doc.status !== "failed";

  return (
    <div>
      <div
        style={{
          paddingBottom: 32,
          borderBottom: "1px solid var(--hair)",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 48,
          alignItems: "end",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
            }}
          >
            {running ? "Audit running" : "Audit complete"}
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-serif)",
              fontSize: 40,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {doc.title}
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
            }}
          >
            {doc.filename}
          </div>
          <div style={{ marginTop: 16 }}>
            <VerdictPill verdict={overall as Citation["verdict"]} />
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
          <Stat label="Risk score" value={riskScore != null ? String(riskScore) : "—"} />
          <Stat label="Citations" value={String(doc.citationCount)} />
          <Stat label="Fabricated" value={String(doc.riskCount)} tone="critical" />
          <Stat label="Unsupported" value={String(doc.warningCount)} tone="amber" />
        </div>
      </div>

      {running && (
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            margin: "24px 0",
            padding: "16px 20px",
            border: "1px solid var(--hair)",
            background: "var(--bg-raised)",
            color: "var(--fg-2)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
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
          {doc.status === "extracting"
            ? "Extracting citations…"
            : "Verifying against the federal reporters…"}
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((c) => {
          const vfs = verifsByCit.get(c.id) ?? [];
          const accent =
            c.verdict === "risk"
              ? "var(--critical)"
              : c.verdict === "warning"
                ? "var(--amber)"
                : c.verdict === "verified"
                  ? "var(--verified)"
                  : "var(--hair-strong)";
          return (
            <div
              key={c.id}
              style={{
                border: "1px solid var(--hair)",
                borderLeft: `2px solid ${accent}`,
                background: "var(--bg-raised)",
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                  }}
                >
                  {c.caseName ? `${c.caseName}, ` : ""}
                  <span style={{ fontWeight: 500 }}>{c.normalized}</span>
                  {c.year ? ` (${c.year})` : ""}
                </div>
                <VerdictPill verdict={c.verdict} />
              </div>
              {vfs.map((v) => (
                <div
                  key={v.id}
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--hair)",
                    fontSize: 13,
                    color: "var(--fg-2)",
                    lineHeight: 1.55,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--fg-3)",
                      marginRight: 8,
                    }}
                  >
                    {v.kind}
                  </span>
                  {v.detail}
                  {v.sourceUrl && (
                    <a
                      href={v.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: 8,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--fg-2)",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        textDecoration: "none",
                      }}
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 48,
          padding: "32px 28px",
          border: "1px solid var(--hair-strong)",
          background: "var(--obsidian-2)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            marginBottom: 12,
          }}
        >
          Save this result
        </div>
        <h3
          style={{
            margin: "0 0 12px",
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.01em",
          }}
        >
          Your trial scan expires in 24 hours.
        </h3>
        <p style={{ margin: "0 0 24px", color: "var(--fg-2)", fontSize: 14 }}>
          Create an account to keep this result, run deep proposition
          validation, generate a signed risk report, and audit additional
          filings.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href={`/sign-up?claim=${doc.id}`}
            className="v-btn v-btn--primary"
          >
            Create account
          </Link>
          <Link href="/pricing" className="v-btn v-btn--secondary">
            See plans
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
          fontSize: 32,
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

function Skeleton() {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "64px 32px",
        border: "1px solid var(--hair)",
        background: "var(--bg-raised)",
        color: "var(--fg-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textAlign: "center",
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
      Loading trial scan…
    </div>
  );
}
