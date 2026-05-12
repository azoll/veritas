"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  documentId: string;
  /** Status at SSR time. We only poll when this isn't terminal yet. */
  initialStatus: string;
};

const TERMINAL = new Set(["ready", "failed"]);

/**
 * Lightweight polling shim. While the document is mid-pipeline
 * (uploaded / extracting / verifying), poll the document JSON every
 * 1.5s and call router.refresh() each time the status field changes
 * so the server component re-fetches everything (citations,
 * verifications, quotes) and re-renders. Stops polling as soon as the
 * status reaches a terminal state.
 *
 * Renders the live "scanning" banner inline so the user has visible
 * feedback that work is in progress — silent polling feels broken.
 */
export function LiveStatus({ documentId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const lastSeen = useRef(initialStatus);

  useEffect(() => {
    if (TERMINAL.has(status)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const r = await fetch(`/api/documents/${documentId}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`(${r.status})`);
        const j = (await r.json()) as { document: { status: string } };
        if (cancelled) return;

        const next = j.document.status;
        if (next !== lastSeen.current) {
          lastSeen.current = next;
          setStatus(next);
          // Pull fresh server-rendered citations/verifications/etc.
          router.refresh();
        }
        if (!TERMINAL.has(next)) {
          timer = setTimeout(tick, 1500);
        }
      } catch {
        // Transient errors are fine — back off and try again.
        if (!cancelled) timer = setTimeout(tick, 4000);
      }
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [documentId, status, router]);

  if (TERMINAL.has(status)) return null;

  return (
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
      {status === "extracting"
        ? "Extracting citations from the filing…"
        : status === "verifying"
          ? "Verifying citations against CourtListener…"
          : "Audit in progress…"}
    </div>
  );
}
