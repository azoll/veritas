export function EmptyScope() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "96px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
        }}
      >
        Pick or create a firm
      </div>
      <h2
        style={{
          marginTop: 12,
          fontFamily: "var(--font-serif)",
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
        }}
      >
        Veritas is multi-tenant.
      </h2>
      <p style={{ marginTop: 16, color: "var(--fg-2)", lineHeight: 1.6 }}>
        Use the organization switcher above to choose a firm to work in, or
        create a new one. All filings, citations, and audit trails are
        scoped per firm.
      </p>
    </div>
  );
}
