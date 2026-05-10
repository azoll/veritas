import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Multi-tenancy model:
 *   - `firm` corresponds 1:1 to a Clerk Organization (clerkOrgId).
 *   - `user` corresponds 1:1 to a Clerk User (clerkUserId).
 *   - Within a firm, users are scoped further by `team` (a sub-tenant — e.g., a
 *     practice group or matter team). Documents always belong to one team.
 *   - Every row that holds firm data carries `firmId` AND (where relevant)
 *     `teamId`, and every query MUST filter by both. This is enforced at the
 *     access layer in src/lib/auth/scope.ts.
 */

export const documentStatus = pgEnum("document_status", [
  "uploaded",
  "parsing",
  "extracting",
  "verifying",
  "ready",
  "failed",
]);

export const verdict = pgEnum("verdict", [
  "verified",
  "warning",
  "risk",
  "unknown",
]);

export const firms = pgTable("firms", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("teams_firm_idx").on(t.firmId)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").notNull().default("attorney"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("users_firm_idx").on(t.firmId)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
  },
  (t) => [
    uniqueIndex("team_members_pk").on(t.teamId, t.userId),
    index("team_members_user_idx").on(t.userId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    blobUrl: text("blob_url").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    rawText: text("raw_text"),
    status: documentStatus("status").notNull().default("uploaded"),
    citationCount: integer("citation_count").notNull().default(0),
    riskCount: integer("risk_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    verifiedCount: integer("verified_count").notNull().default(0),
    confidenceScore: integer("confidence_score"),
    /** When true, run proposition validation via AI Gateway in addition to
     *  the deterministic checks. Default: standard scan only. */
    deepScan: boolean("deep_scan").notNull().default(false),
    /** For anonymous trial uploads. Cookie value; null for authenticated
     *  uploads. Trial documents are anchored to the seeded anonymous firm. */
    trialSessionId: text("trial_session_id"),
    /** Trial documents auto-expire 24h after upload unless claimed by sign-up. */
    expiresAt: timestamp("expires_at"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("documents_firm_team_idx").on(t.firmId, t.teamId),
    index("documents_status_idx").on(t.status),
    index("documents_trial_idx").on(t.trialSessionId, t.expiresAt),
  ],
);

export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    /** Raw citation as it appeared in the document, e.g. "Smith v. Jones, 123 F.3d 456 (9th Cir. 2001)". */
    rawText: text("raw_text").notNull(),
    /** Best-effort normalized form. */
    normalized: text("normalized"),
    caseName: text("case_name"),
    reporter: text("reporter"),
    volume: text("volume"),
    page: text("page"),
    pinpointPage: text("pinpoint_page"),
    court: text("court"),
    year: integer("year"),
    /** Character offsets into documents.rawText. */
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    /** Surrounding sentence(s) — gives the LLM context to evaluate proposition support. */
    contextSnippet: text("context_snippet"),
    /** Verdict rolled up from this citation's verifications. */
    verdict: verdict("verdict").notNull().default("unknown"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("citations_doc_idx").on(t.documentId)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    citationId: uuid("citation_id")
      .notNull()
      .references(() => citations.id, { onDelete: "cascade" }),
    /** Quoted text as it appears in the brief. */
    quotedText: text("quoted_text").notNull(),
    /** Text actually found in the source opinion (if any). */
    sourceText: text("source_text"),
    matchScore: integer("match_score"),
    verdict: verdict("verdict").notNull().default("unknown"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("quotes_citation_idx").on(t.citationId)],
);

/**
 * One row per check we ran against a citation. Multiple checks per citation
 * (existence, treatment, pincite, proposition) — each gets its own audited row.
 */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    citationId: uuid("citation_id")
      .notNull()
      .references(() => citations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** existence | pincite | treatment | proposition | adversarial */
    kind: text("kind").notNull(),
    verdict: verdict("verdict").notNull(),
    /** Source we consulted, e.g. "courtlistener:cluster/12345" */
    source: text("source"),
    sourceUrl: text("source_url"),
    /** Model identifier when LLM was used, e.g. "anthropic/claude-opus-4-7". */
    model: text("model"),
    /** Hash of the prompt actually sent. */
    promptHash: text("prompt_hash"),
    /** Free-form reasoning shown to the user. */
    detail: text("detail"),
    /** Raw response payload for full reproducibility. */
    raw: jsonb("raw"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("verifications_citation_idx").on(t.citationId),
    index("verifications_doc_idx").on(t.documentId),
  ],
);

/**
 * Append-only audit trail. Never UPDATE/DELETE these rows.
 * Anything that touches firm data writes one event here.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firmId: uuid("firm_id").notNull(),
    teamId: uuid("team_id"),
    actorUserId: uuid("actor_user_id"),
    actorClerkId: text("actor_clerk_id"),
    action: text("action").notNull(),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_firm_idx").on(t.firmId, t.createdAt),
    index("audit_target_idx").on(t.targetKind, t.targetId),
  ],
);

export type Document = typeof documents.$inferSelect;
export type Citation = typeof citations.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
