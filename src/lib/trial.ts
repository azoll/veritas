import { randomUUID } from "node:crypto";
import { and, eq, gt, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const ANON_FIRM_KEY = "__anonymous__";
const TRIAL_TTL_MS = 24 * 60 * 60 * 1000;
export const TRIAL_COOKIE = "v_trial";

/**
 * Returns the seeded anonymous firm, creating it on first call.
 * Trial uploads from unauthenticated users live under this firm and are
 * scoped further by the `trial_session_id` cookie.
 */
export async function getAnonymousFirm() {
  const [existing] = await db
    .select()
    .from(schema.firms)
    .where(eq(schema.firms.clerkOrgId, ANON_FIRM_KEY));
  if (existing) return existing;

  const [created] = await db
    .insert(schema.firms)
    .values({ clerkOrgId: ANON_FIRM_KEY, name: "Anonymous Trials" })
    .returning();
  return created;
}

/**
 * Returns the seeded "default" team inside the anonymous firm. Trial
 * uploads must reference a team because documents.team_id is NOT NULL.
 */
export async function getAnonymousTeam(firmId: string) {
  const [existing] = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.firmId, firmId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(schema.teams)
    .values({ firmId, name: "Anonymous" })
    .returning();
  return created;
}

/** New 24h expiry timestamp from now. */
export function trialExpiry(): Date {
  return new Date(Date.now() + TRIAL_TTL_MS);
}

/** Generate a fresh trial session id (also used as cookie value). */
export function newTrialSessionId(): string {
  return randomUUID();
}

/** Return all non-expired trial docs for this session. */
export async function listTrialDocs(sessionId: string) {
  return db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.trialSessionId, sessionId),
        isNotNull(schema.documents.expiresAt),
        gt(schema.documents.expiresAt, new Date()),
      ),
    );
}

/**
 * Claim trial docs into a real firm. Called when a trial user signs up
 * — we re-parent the documents to their newly-created firm and team,
 * clear the trial fields, and log the claim event.
 */
export async function claimTrialDocs(args: {
  sessionId: string;
  firmId: string;
  teamId: string;
  userId: string;
}) {
  const rows = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.trialSessionId, args.sessionId));
  if (!rows.length) return 0;

  for (const r of rows) {
    await db
      .update(schema.documents)
      .set({
        firmId: args.firmId,
        teamId: args.teamId,
        uploadedById: args.userId,
        trialSessionId: null,
        expiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, r.id));

    await db
      .update(schema.citations)
      .set({ firmId: args.firmId })
      .where(eq(schema.citations.documentId, r.id));
  }
  return rows.length;
}
