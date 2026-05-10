"use client";

import { useState } from "react";
import type { Citation, Verification, Quote } from "@/lib/db/schema";
import { VerdictPill } from "@/components/ui/Verdict";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<string, string> = {
  existence: "Citation exists",
  treatment: "Subsequent treatment",
  pincite: "Pincite / quote",
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

  return (
    <div
      className={cn(
        "rounded-sm border hairline bg-paper",
        v === "risk" && "border-risk/30",
        v === "warning" && "border-warn/30",
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-6 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm text-ink">
            {citation.caseName ? `${citation.caseName}, ` : ""}
            <span className="font-semibold">{citation.normalized}</span>
            {citation.year ? ` (${citation.year})` : ""}
          </div>
          {citation.contextSnippet && (
            <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
              …{citation.contextSnippet}…
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <VerdictPill verdict={v} />
          <span className="text-muted">{open ? "−" : "+"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t hairline bg-paper-2/40 px-5 py-4">
          {citation.notes && (
            <div className="mb-4 rounded-sm bg-risk/10 px-3 py-2 text-sm text-risk">
              {citation.notes}
            </div>
          )}

          <div className="space-y-3">
            {verifications.map((v) => (
              <div key={v.id} className="flex gap-4">
                <div className="w-40 shrink-0 text-xs uppercase tracking-wider text-muted">
                  {KIND_LABEL[v.kind] ?? v.kind}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <VerdictPill verdict={v.verdict} />
                    {v.sourceUrl && (
                      <a
                        href={v.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gold-2 hover:underline"
                      >
                        Source ↗
                      </a>
                    )}
                  </div>
                  {v.detail && (
                    <p className="mt-2 text-sm leading-relaxed text-ink/80">
                      {v.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {quotes.length > 0 && (
              <div className="mt-4 rounded-sm border hairline bg-paper p-4">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted">
                  Quoted language
                </div>
                {quotes.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <blockquote className="border-l-2 border-gold pl-3 font-display text-base italic">
                      “{q.quotedText}”
                    </blockquote>
                    <div className="text-xs text-muted">
                      Match score: {q.matchScore ?? 0}% · {q.verdict}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {verifications.length === 0 && (
              <div className="text-sm text-muted">
                No checks have completed yet for this citation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
