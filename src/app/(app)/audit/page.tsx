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
    <div
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "64px 40px",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: 48 }}>
        <div className="v-eyebrow">Defensible Audit Trail</div>
        <h1
          style={{
            margin: "12px 0 16px",
            fontFamily: "var(--font-serif)",
            fontSize: 56,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Activity
        </h1>
        <p
          style={{
            maxWidth: 680,
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--fg-2)",
          }}
        >
          Every action — uploads, verifications, model invocations — is
          logged here, append-only, scoped to your firm. Export at any time
          for compliance, malpractice review, or court inquiry.
        </p>
      </div>

      <div style={{ border: "1px solid var(--hair)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr 1fr 1fr",
            gap: 16,
            padding: "12px 20px",
            background: "var(--bg-raised)",
            borderBottom: "1px solid var(--hair)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
          }}
        >
          <div>When</div>
          <div>Action</div>
          <div>Target</div>
          <div>Actor</div>
        </div>
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr 1fr 1fr",
              gap: 16,
              padding: "12px 20px",
              borderBottom: "1px solid var(--hair)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-2)",
            }}
          >
            <div style={{ color: "var(--fg-3)" }}>
              {new Date(e.createdAt)
                .toISOString()
                .replace("T", " ")
                .slice(0, 19)}
            </div>
            <div style={{ color: "var(--fg)" }}>{e.action}</div>
            <div>
              {e.targetKind}/{e.targetId?.slice(0, 8)}
            </div>
            <div>{e.actorClerkId?.slice(0, 14) ?? "system"}</div>
          </div>
        ))}
        {events.length === 0 && (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
