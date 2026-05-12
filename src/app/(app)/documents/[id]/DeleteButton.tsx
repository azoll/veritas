"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Two-stage confirm: first click arms the button, second click commits.
 * Avoids accidental deletes without needing a modal — same pattern GitHub
 * uses for destructive repo actions. The armed state auto-disarms after
 * five seconds so an idle armed button can't be clicked into oblivion.
 */
export function DeleteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function arm() {
    setError(null);
    setArmed(true);
    setTimeout(() => setArmed(false), 5000);
  }

  function commit() {
    startTransition(async () => {
      try {
        const r = await fetch(`/api/documents/${documentId}`, {
          method: "DELETE",
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `(${r.status})`);
        }
        router.push("/dashboard");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        setArmed(false);
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {error && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--critical)",
            letterSpacing: "0.04em",
          }}
        >
          Delete failed: {error}
        </span>
      )}
      <button
        type="button"
        onClick={armed ? commit : arm}
        disabled={pending}
        className="v-btn v-btn--sm"
        style={{
          background: armed ? "var(--critical)" : "transparent",
          color: armed ? "var(--obsidian)" : "var(--fg-2)",
          border: `1px solid ${armed ? "var(--critical)" : "var(--hair-strong)"}`,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
          transition: "background 120ms, color 120ms, border-color 120ms",
        }}
      >
        {pending
          ? "Deleting…"
          : armed
            ? "Click again to confirm"
            : "Delete filing"}
      </button>
    </div>
  );
}
