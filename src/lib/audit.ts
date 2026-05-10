import { db, schema } from "@/lib/db";

export async function logAudit(input: {
  firmId: string;
  teamId?: string;
  actorUserId?: string;
  actorClerkId?: string;
  action: string;
  targetKind?: string;
  targetId?: string;
  payload?: unknown;
}) {
  await db.insert(schema.auditEvents).values({
    firmId: input.firmId,
    teamId: input.teamId,
    actorUserId: input.actorUserId,
    actorClerkId: input.actorClerkId,
    action: input.action,
    targetKind: input.targetKind,
    targetId: input.targetId,
    payload: input.payload as never,
  });
}
