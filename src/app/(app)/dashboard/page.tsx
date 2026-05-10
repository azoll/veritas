import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { getScope } from "@/lib/auth/scope";
import { db, schema } from "@/lib/db";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { VerdictPill } from "@/components/ui/Verdict";
import { EmptyScope } from "@/components/EmptyScope";

export const dynamic = "force-dynamic";

function rollupVerdict(d: {
  riskCount: number;
  warningCount: number;
  verifiedCount: number;
  status: string;
}): "verified" | "warning" | "risk" | "unknown" {
  if (d.status !== "ready") return "unknown";
  if (d.riskCount > 0) return "risk";
  if (d.warningCount > 0) return "warning";
  return "verified";
}

export default async function DashboardPage() {
  const scope = await getScope();
  if (!scope) return <EmptyScope />;

  const docs = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.firmId, scope.firmId))
    .orderBy(desc(schema.documents.createdAt))
    .limit(50);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-12">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-2">
          Verification Queue
        </div>
        <h1 className="mt-2 font-display text-4xl">Documents</h1>
      </div>

      <UploadDropzone />

      <div className="mt-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recent</h2>
          <span className="text-xs text-muted">{docs.length} document(s)</span>
        </div>

        {docs.length === 0 ? (
          <div className="rounded-sm border hairline px-6 py-12 text-center text-muted">
            No documents yet. Upload a brief above to start verification.
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border hairline">
            <table className="w-full text-sm">
              <thead className="bg-paper-2 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-right">Citations</th>
                  <th className="px-4 py-3 text-right">Risk</th>
                  <th className="px-4 py-3 text-right">Confidence</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const v = rollupVerdict(d);
                  return (
                    <tr
                      key={d.id}
                      className="border-t hairline hover:bg-paper-2/60"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/documents/${d.id}`}
                          className="font-medium text-ink hover:text-gold-2"
                        >
                          {d.title}
                        </Link>
                        <div className="text-xs text-muted">{d.filename}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {d.citationCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="tabular-nums text-risk">
                          {d.riskCount}
                        </span>
                        <span className="mx-1 text-muted-2">/</span>
                        <span className="tabular-nums text-warn">
                          {d.warningCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {d.confidenceScore != null
                          ? `${d.confidenceScore}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <VerdictPill verdict={v} />
                        {d.status !== "ready" && (
                          <span className="ml-2 text-xs text-muted">
                            {d.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
