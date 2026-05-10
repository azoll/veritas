import Link from "next/link";
import { Seal, VWordmark } from "@/components/brand/Seal";

export const dynamic = "force-static";

const TIERS = [
  {
    name: "Trial",
    price: "Free",
    cadence: "no card required",
    summary: "One filing, results held 24 hours.",
    bullets: [
      "1 standard scan",
      "Citation existence & treatment",
      "Pincite / quotation match",
      "Auto-expires in 24h",
    ],
    cta: { label: "Run a scan", href: "/scan" },
    accent: false,
  },
  {
    name: "Solo",
    price: "$149",
    cadence: "per month",
    summary: "Single attorney. Cover the work that already goes out the door.",
    bullets: [
      "25 standard scans / mo",
      "5 deep scans / mo (proposition validation)",
      "Signed risk-report PDFs",
      "30-day result retention",
    ],
    cta: { label: "Start Solo", href: "/sign-up?plan=solo" },
    accent: false,
  },
  {
    name: "Solo+",
    price: "$299",
    cadence: "per month",
    summary: "High-volume solo. Appellate, motion-heavy practices.",
    bullets: [
      "100 standard scans / mo",
      "25 deep scans / mo",
      "Signed risk-report PDFs",
      "Read-only review URLs",
      "Priority queue",
    ],
    cta: { label: "Start Solo+", href: "/sign-up?plan=solo-plus" },
    accent: true,
  },
  {
    name: "Firm",
    price: "$999",
    cadence: "starting / month",
    summary: "Team usage, pooled scan quota, governance baseline.",
    bullets: [
      "5-seat minimum, $99 / seat add-on",
      "Pooled 500 standard / 100 deep scans",
      "Adversarial review (Phase 1)",
      "SSO, audit export, team sub-tenants",
      "Annual commit available",
    ],
    cta: { label: "Talk to us", href: "mailto:hello@veritas.law" },
    accent: false,
  },
];

export default function PricingPage() {
  return (
    <div>
      <Nav />

      <section style={{ borderBottom: "1px solid var(--hair)", padding: "112px 40px 72px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="v-eyebrow" style={{ marginBottom: 24 }}>
            Pricing
          </div>
          <h1
            style={{
              margin: "0 0 24px",
              fontFamily: "var(--font-serif)",
              fontSize: 88,
              fontWeight: 400,
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
            }}
          >
            Priced per filing.
            <br />
            Not per token.
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 680,
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--fg-2)",
            }}
          >
            A scan is the unit lawyers understand: one brief, one motion,
            one memo. Veritas verifies citations, validates quotations, and
            generates a signed defensibility report. Pricing scales with
            filing volume, not with infrastructure cost.
          </p>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid var(--hair)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "64px 40px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              border: "1px solid var(--hair)",
            }}
          >
            {TIERS.map((t, i) => (
              <article
                key={t.name}
                style={{
                  padding: "40px 28px 32px",
                  borderRight: i < TIERS.length - 1 ? "1px solid var(--hair)" : 0,
                  background: t.accent ? "var(--obsidian-2)" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 560,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: t.accent ? "#B88230" : "var(--fg-3)",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: "var(--font-serif)",
                    fontSize: 56,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {t.price}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--fg-3)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t.cadence}
                </div>
                <p
                  style={{
                    margin: "24px 0",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "var(--fg-2)",
                  }}
                >
                  {t.summary}
                </p>
                <ul
                  style={{
                    margin: "0 0 32px",
                    padding: 0,
                    listStyle: "none",
                    borderTop: "1px solid var(--hair)",
                  }}
                >
                  {t.bullets.map((b) => (
                    <li
                      key={b}
                      style={{
                        padding: "10px 0",
                        borderBottom: "1px solid var(--hair)",
                        fontSize: 13,
                        color: "var(--fg)",
                      }}
                    >
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta.href}
                  className={
                    t.accent
                      ? "v-btn v-btn--primary"
                      : "v-btn v-btn--secondary"
                  }
                  style={{ marginTop: "auto" }}
                >
                  {t.cta.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          borderBottom: "1px solid var(--hair)",
          background: "var(--obsidian-2)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "96px 40px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          <div>
            <div className="v-eyebrow" style={{ marginBottom: 24 }}>
              The math
            </div>
            <h2
              style={{
                margin: "0 0 24px",
                fontFamily: "var(--font-serif)",
                fontSize: 48,
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              One avoided sanction pays for years of Veritas.
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--fg-2)",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Published monetary sanctions for AI-fabricated citations have
              ranged from $5,000 to more than $100,000 — before counting
              cost orders, fee-shifting, disqualification, and bar referrals.
              A $5,000 sanction is thirty-three months of Solo. A
              $109,700 sanction is sixty-one years.
            </p>
          </div>
          <div
            style={{
              border: "1px solid var(--hair-strong)",
              padding: "32px",
              background: "var(--obsidian)",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "16px 24px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--fg-3)" }}>$5,000</span>
            <span style={{ color: "var(--fg)" }}>33 months · Solo</span>
            <span style={{ color: "var(--fg-3)" }}>$10,000</span>
            <span style={{ color: "var(--fg)" }}>67 months · Solo</span>
            <span style={{ color: "var(--fg-3)" }}>$109,700</span>
            <span style={{ color: "var(--fg)" }}>61 years · Solo</span>
            <span style={{ color: "var(--fg-3)" }}>1 disqualification</span>
            <span style={{ color: "var(--fg)" }}>incalculable</span>
          </div>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid var(--hair)", padding: "112px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2
            style={{
              margin: "0 0 32px",
              fontFamily: "var(--font-serif)",
              fontSize: 56,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            Verify your first filing now.
          </h2>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/scan" className="v-btn v-btn--primary v-btn--lg">
              Run a free scan
            </Link>
            <Link href="/" className="v-btn v-btn--secondary v-btn--lg">
              Back to overview
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ padding: "32px 40px" }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            letterSpacing: "0.04em",
          }}
        >
          <span>© 2026 Veritas, Inc.</span>
          <span>Trust, verified.</span>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  return (
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
        <nav style={{ display: "flex", gap: 32 }}>
          <Link href="/" style={navLink}>Platform</Link>
          <Link href="/scan" style={navLink}>Run a scan</Link>
          <Link href="/pricing" style={{ ...navLink, color: "var(--fg)" }}>Pricing</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/sign-in" style={navLink}>Sign in</Link>
          <Link href="/sign-up" className="v-btn v-btn--primary v-btn--sm">
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}

const navLink: React.CSSProperties = {
  color: "var(--fg-2)",
  fontSize: 13,
  textDecoration: "none",
  letterSpacing: "0.02em",
};
