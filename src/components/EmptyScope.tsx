export function EmptyScope() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="text-xs uppercase tracking-[0.25em] text-gold-2">
        Pick or create a firm
      </div>
      <h2 className="mt-3 font-display text-3xl">Veritas is multi-tenant</h2>
      <p className="mt-4 text-muted">
        Use the organization switcher above to choose a firm to work in, or
        create a new one. All documents, citations, and audit trails are
        scoped per firm.
      </p>
    </div>
  );
}
