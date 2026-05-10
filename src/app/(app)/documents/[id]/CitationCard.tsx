"use client";

import { useState } from "react";
import type { Citation, Verification, Quote } from "@/lib/db/schema";
import { VerdictPill } from "@/components/ui/Verdict";

const KIND_LABEL: Record<string, string> = {
  existence: "Citation exists",
  treatment: "Subsequent treatment",
  pincite: "Pincite · quote",
  proposition: "Proposition support",
  adversarial: "Adversarial review",
};

export function CitationCard({
  citation,
  verifications,
  quotes,
}: {
  citation: Citation;
  verifications: Verification[];
  quotes: Quote[];
}) {
  const [open, setOpen] = useState(citation.verdict !== "verified");
  const v = citation.verdict;

  const accent =
    v === "risk"
      ? "var(--critical)"
      : v === "warning"
        ? "var(--amber)"
        : v === "verified"
          ? "var(--verified)"
          : "var(--hair-strong)";

  return (
    <div
      style={{
        border: "1px solid var(--hair)",
        borderLeft: `2px solid ${accent}`,
        background: "var(--bg-raised)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          width: "100%",
          padding: "16px 20px",
          background: "transparent",
          border: 0,
          color: "var(--fg)",
          textAlign: "left",
          cursor: "pointer",
          gap: 24,
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--fg)",
            }}
          >
            {citation.caseName ? `${citation.caseName}, ` : ""}
            <span style={{ fontWeight: 500 }}>{citation.normalized}</span>
            {citation.year ? ` (${citation.year})` : ""}
          </div>
          {citation.contextSnippet && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "var(--fg-2)",
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              …{citation.contextSnippet}…
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <VerdictPill verdict={v} />
          <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            {open ? "−" : "+"}
          </span>
        </div>
      </button>

      {open && (
        <div
          style={{
            borderTop: "1px solid var(--hair)",
            padding: "20px",
            background: "var(--bg-secondary)",
          }}
        >
          {citation.notes && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "var(--critical-bg)",
                color: "var(--critical)",
                fontSize: 13,
                border: "1px solid var(--critical)",
              }}
            >
              {citation.notes}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {verifications.map((vf) => (
              <div key={vf.id} style={{ display: "flex", gap: 16 }}>
                <div
                  style={{
                    width: 160,
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--fg-3)",
                  }}
                >
                  {KIND_LABEL[vf.kind] ?? vf.kind}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <VerdictPill verdict={vf.verdict} />
                    {vf.sourceUrl && (
                      <a
                        href={vf.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--fg-2)",
                          textDecoration: "none",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        Source ↗
                      </a>
                    )}
                  </div>
                  {vf.detail && (
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 14,
                        color: "var(--fg)",
                        lineHeight: 1.6,
                      }}
                    >
                      {vf.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {quotes.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: 16,
                  border: "1px solid var(--hair)",
                  background: "var(--bg-raised)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--fg-3)",
                    marginBottom: 12,
                  }}
                >
                  Quoted language
                </div>
                {quotes.map((q) => (
                  <div key={q.id}>
                    <blockquote
                      style={{
                        margin: 0,
                        paddingLeft: 14,
                        borderLeft: "2px solid #B88230",
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 16,
                        lineHeight: 1.5,
                      }}
                    >
                      &ldquo;{q.quotedText}&rdquo;
                    </blockquote>
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--fg-3)",
                      }}
                    >
                      Match score: {q.matchScore ?? 0}% · {q.verdict}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {verifications.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
                No checks have completed yet for this citation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
