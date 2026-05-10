import { desc, eq } from "drizzle-orm";
import { getScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { EmptyScope } from "@/components/EmptyScope";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const scope = await getScope();
  if (!scope) return <EmptyScope />;

  const events = await db
    .select()
    .from(schema.auditEvents)
    .where(eq(schema.auditEvents.firmId, scope.firmId))
    .orderBy(desc(schema.auditEvents.createdAt))
    .limit(200);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-2">
          Defensible Audit Trail
        </div>
        <h1 className="mt-2 font-display text-4xl">Activity</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Every action — uploads, verifications, model invocations — is
          logged here, append-only, scoped to your firm. Export at any time
          for compliance, malpractice review, or court inquiry.
        </p>
      </div>

      <div className="overflow-hidden rounded-sm border hairline">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Target</th>
              <th className="px-4 py-3 text-left">Actor</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t hairline">
                <td className="px-4 py-3 text-xs tabular-nums text-muted">
                  {new Date(e.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {e.targetKind}/{e.targetId?.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {e.actorClerkId?.slice(0, 14) ?? "system"}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
