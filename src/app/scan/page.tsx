import { cookies } from "next/headers";
import Link from "next/link";
import { and, eq, gt, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { TRIAL_COOKIE } from "@/lib/trial";
import { Seal, VWordmark } from "@/components/brand/Seal";
import { TrialUpload } from "./TrialUpload";
import { TrialResult } from "./TrialResult";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const sessionId = (await cookies()).get(TRIAL_COOKIE)?.value;

  // If they have a live trial scan, show it.
  let activeDoc: typeof schema.documents.$inferSelect | null = null;
  if (sessionId) {
    const [row] = await db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.trialSessionId, sessionId),
          gt(schema.documents.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(schema.documents.createdAt))
      .limit(1);
    if (row) activeDoc = row;
  }

  return (
    <div>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--obsidian)",
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            height: 64,
            padding: "0 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "var(--fg)",
              textDecoration: "none",
            }}
          >
            <Seal size={22} />
            <VWordmark />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/pricing"
              style={{
                color: "var(--fg-2)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              style={{
                color: "var(--fg-2)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
            <Link href="/sign-up" className="v-btn v-btn--primary v-btn--sm">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "96px 40px",
        }}
      >
        <div className="v-eyebrow" style={{ marginBottom: 24 }}>
          Free trial scan
        </div>
        <h1
          style={{
            margin: "0 0 24px",
            fontFamily: "var(--font-serif)",
            fontSize: 72,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          Verify before you file.
        </h1>
        <p
          style={{
            margin: "0 0 56px",
            maxWidth: 640,
            fontSize: 17,
            lineHeight: 1.55,
            color: "var(--fg-2)",
          }}
        >
          One brief, motion, or memo. No account required. Veritas will check
          every citation against the federal and state reporters, validate
          quoted language, and flag negative treatment. Result held for 24
          hours.
        </p>

        {activeDoc ? (
          <TrialResult documentId={activeDoc.id} />
        ) : (
          <TrialUpload />
        )}

        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid var(--hair)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32,
            fontSize: 13,
            color: "var(--fg-2)",
          }}
        >
          <Limit n="01" label="Limit" value="One scan per trial" />
          <Limit n="02" label="Retention" value="24 hours, then auto-purge" />
          <Limit
            n="03"
            label="Depth"
            value="Standard scan only — proposition validation requires sign-up"
          />
        </div>
      </main>
    </div>
  );
}

function Limit({ n, label, value }: { n: string; label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "var(--fg-3)",
        }}
      >
        {n}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: "var(--fg)",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}
