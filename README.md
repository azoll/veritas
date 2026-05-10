# Veritas

**AI Trust Infrastructure for the Legal Profession.**
Every citation defensible. Trust. Verified.

Veritas verifies AI-assisted legal work — checking every citation against
real opinions, validating pincites and quotations, flagging negative
treatment, and logging a defensible audit trail — before the work leaves
the firm.

## Phase 0 (this MVP) — what works

- **Multi-tenant** auth (Clerk: org per firm, sub-tenant teams within firm)
- **Upload** PDF / DOCX briefs to Vercel Blob, parsed to text
- **Citation extraction** — deterministic regex pass over reporter-style cites
- **Citation existence check** against [CourtListener](https://www.courtlistener.com/)
  (~9M opinions). Hallucinated cases surface immediately.
- **Pincite / quote verification** — does the quoted language actually
  appear in the opinion at the cited location?
- **Treatment signal** — non-precedential / unpublished flagged; citation
  count shown.
- **Verification dashboard** — risk-sorted, GitHub-PR-review style.
- **Append-only audit trail** — every upload, model invocation, and
  verification is logged per firm.
- **Printable verification report** — `/api/documents/:id/report`
  (HTML, browser-print to PDF).

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Auth | Clerk (Vercel Marketplace) |
| DB | Neon Postgres + Drizzle ORM |
| Storage | Vercel Blob |
| Compute | Fluid Compute |
| AI | Vercel AI Gateway (Phase 1+) |
| External | CourtListener REST v4 |

## Local dev

```bash
pnpm install
cp .env.example .env.local   # fill in keys
pnpm db:push                 # apply schema to Neon
pnpm dev
```

Open http://localhost:3000.

## Roadmap

- **Phase 1** — Adversarial AI reviewer, proposition validation, missing-authority detection
- **Phase 2** — Word & Google Docs plugins, iManage / NetDocuments connectors, enterprise governance
- **Phase 3** — Precedent graph, judge tendency, motion outcome modeling
- **Phase 4** — Court-grade attestations, insurer integrations
