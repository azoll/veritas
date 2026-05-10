import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type Scope = {
  firmId: string;
  userId: string;
  clerkUserId: string;
  clerkOrgId: string;
};

/**
 * Resolves Clerk org+user → Veritas firm/user, creating rows on first sight.
 * Returns null when there is no signed-in user OR no active org. Pages can
 * branch on null to render an "empty state"; API routes wrap with
 * `requireScope` to convert null into a Response.
 */
export async function getScope(): Promise<Scope | null> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "";
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

  let [firm] = await db
    .select()
    .from(schema.firms)
    .where(eq(schema.firms.clerkOrgId, orgId));
  if (!firm) {
    const orgName =
      (user?.publicMetadata as { orgName?: string } | undefined)?.orgName ??
      "Unnamed Firm";
    [firm] = await db
      .insert(schema.firms)
      .values({ clerkOrgId: orgId, name: orgName })
      .returning();
  }

  let [u] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkUserId, userId));
  if (!u) {
    [u] = await db
      .insert(schema.users)
      .values({ clerkUserId: userId, firmId: firm.id, email, name })
      .returning();
  }

  return {
    firmId: firm.id,
    userId: u.id,
    clerkUserId: userId,
    clerkOrgId: orgId,
  };
}

/** API-route helper: returns Scope or throws a Response (401/412). */
export async function requireScope(): Promise<Scope> {
  const { userId, orgId } = await auth();
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  if (!orgId)
    throw new Response("No active organization. Pick or create a firm.", {
      status: 412,
    });
  const s = await getScope();
  if (!s) throw new Response("Scope resolution failed", { status: 500 });
  return s;
}
