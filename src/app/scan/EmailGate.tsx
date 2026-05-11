"use client";

import { useState } from "react";

/**
 * Email-capture wall over the trial scan result. Submitting the form
 * records the user as a marketing lead, sets a same-document client
 * cookie that the result component reads to flip into "unlocked" mode,
 * and returns the page to a server-refresh so SSR can reveal results.
 */
export function EmailGate({
  documentId,
  onUnlock,
}: {
  documentId: string;
  onUnlock: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/trial/${documentId}/lead`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          firm: firm || undefined,
          optInUpdates: optIn,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `Submit failed (${r.status})`);
      }
      onUnlock();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--hair-strong)",
        background: "var(--obsidian-2)",
        padding: "40px 36px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
          marginBottom: 16,
        }}
      >
        Audit complete
      </div>
      <h2
        style={{
          margin: "0 0 16px",
          fontFamily: "var(--font-serif)",
          fontSize: 36,
          fontWeight: 400,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        Your filing has been reviewed.
      </h2>
      <p
        style={{
          margin: "0 0 28px",
          maxWidth: 540,
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--fg-2)",
        }}
      >
        Veritas has finished checking citations, quotations, and treatment.
        Tell us where to send the result. We&apos;ll also send a copy of
        your <span style={{ color: "var(--fg)" }}>Verification Certificate</span>{" "}
        — a hashed, time-stamped record of the review you can attach to
        the filing or hand to opposing counsel.
      </p>

      <form
        onSubmit={submit}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px 24px",
          maxWidth: 640,
        }}
      >
        <Field label="Email">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="v-input"
            placeholder="you@firm.com"
          />
        </Field>
        <Field label="Name (optional)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="v-input"
            placeholder="Your name"
          />
        </Field>
        <Field label="Firm (optional)">
          <input
            type="text"
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            className="v-input"
            placeholder="Firm or practice"
          />
        </Field>
        <div style={{ alignSelf: "end" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--fg-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
            />
            Send me occasional product updates
          </label>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            className="v-btn v-btn--primary"
            disabled={busy || !email}
          >
            {busy ? "Unlocking…" : "Reveal result"}
          </button>
          {error && (
            <span style={{ marginLeft: 16, color: "var(--critical)", fontSize: 13 }}>
              {error}
            </span>
          )}
        </div>
      </form>

      <div
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid var(--hair)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-3)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1.6,
        }}
      >
        We will never share your email. You can opt out at any time.
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
