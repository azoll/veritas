import Link from "next/link";
import { Seal, VWordmark } from "@/components/brand/Seal";

export const dynamic = "force-static";

const TIERS = [
  {
    name: "Trial",
    price: "Free",
    cadence: "no card required",
    summary: "One filing. We send the review and a Verification Certificate.",
    bullets: [
      "1 filing review",
      "Citation, quotation, and treatment check",
      "Verification Certificate by email",
      "Result retained 24 hours",
    ],
    cta: { label: "Run a review", href: "/scan" },
    accent: false,
  },
  {
    name: "Solo",
    price: "$199",
    cadence: "per month",
    summary: "Single attorney. Cover the work that already goes out the door.",
    bullets: [
      "15 filing reviews / month",
      "Citation · quotation · treatment · proposition review",
      "Signed Verification Certificate per filing",
      "Result retained 30 days",
      "Email support",
    ],
    cta: { label: "Start Solo", href: "/sign-up?plan=solo" },
    accent: false,
  },
  {
    name: "Team",
    price: "$999",
    cadence: "per month",
    summary: "Boutique litigation firms. Pooled review quota across the team.",
    bullets: [
      "100 filing reviews / month",
      "All Solo features",
      "Up to 10 attorneys, shared pool",
      "Adversarial review (Phase 1)",
      "Read-only review URLs",
      "Priority queue",
    ],
    cta: { label: "Start Team", href: "/sign-up?plan=team" },
    accent: true,
  },
  {
    name: "Firm",
    price: "$2,499",
    cadence: "per month",
    summary: "Mid-sized litigation firms. Internal governance baseline.",
    bullets: [
      "500 filing reviews / month",
      "All Team features",
      "SSO, audit export, sub-tenants",
      "Custom severity policy",
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

      <section
        style={{
          borderBottom: "1px solid var(--hair)",
          padding: "112px 40px 72px",
        }}
      >
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
            Priced per filing review.
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
            A filing review is one brief, motion, or memo run through the
            Veritas pipeline. Every review checks citations, validates
            quotations, surfaces negative treatment, evaluates proposition
            support, and produces a hashed, time-stamped Verification
            Certificate that travels with the filing.
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
                  borderRight:
                    i < TIERS.length - 1 ? "1px solid var(--hair)" : 0,
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
          <div
            style={{
              marginTop: 16,
              padding: "16px 20px",
              border: "1px solid var(--hair)",
              background: "var(--bg-raised)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.04em",
              color: "var(--fg-3)",
              lineHeight: 1.6,
            }}
          >
            ENTERPRISE · Custom pricing for governance, compliance reporting,
            on-prem, and insurer integrations. Talk to us at{" "}
            <a
              href="mailto:hello@veritas.law"
              style={{ color: "var(--fg-2)" }}
            >
              hello@veritas.law
            </a>
            .
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
              Pilot members
            </div>
            <h2
              style={{
                margin: "0 0 24px",
                fontFamily: "var(--font-serif)",
                fontSize: 40,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Our first attorneys are pilot members.
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--fg-2)",
                fontSize: 15,
                lineHeight: 1.65,
              }}
            >
              For the first cohort, every filing is reviewed by Veritas
              software and double-checked by a real person on our team.
              You get a direct line, calibration on edge cases, and your
              feedback shapes the product. Same pricing, additional
              hand-holding. Mention &ldquo;pilot&rdquo; when you sign up.
            </p>
          </div>
          <div
            style={{
              border: "1px solid var(--hair-strong)",
              padding: "28px",
              background: "var(--obsidian)",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--fg-3)" }}>Cohort</span>
            <span style={{ color: "var(--fg)" }}>First 10 firms</span>
            <span style={{ color: "var(--fg-3)" }}>Onboarding</span>
            <span style={{ color: "var(--fg)" }}>30-minute call · 1:1</span>
            <span style={{ color: "var(--fg-3)" }}>Review check</span>
            <span style={{ color: "var(--fg)" }}>Every filing, by hand</span>
            <span style={{ color: "var(--fg-3)" }}>Feedback loop</span>
            <span style={{ color: "var(--fg)" }}>Direct to founders</span>
            <span style={{ color: "var(--fg-3)" }}>Pricing</span>
            <span style={{ color: "var(--fg)" }}>Standard tiers</span>
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
            padding: "80px 40px",
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
                fontSize: 40,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
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
              cost orders, fee-shifting, disqualification, and bar
              referrals. A $5,000 sanction is twenty-five months of Solo. A
              $109,700 sanction is forty-six years.
            </p>
          </div>
          <div
            style={{
              border: "1px solid var(--hair-strong)",
              padding: "28px",
              background: "var(--obsidian)",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--fg-3)" }}>$5,000</span>
            <span style={{ color: "var(--fg)" }}>25 months · Solo</span>
            <span style={{ color: "var(--fg-3)" }}>$10,000</span>
            <span style={{ color: "var(--fg)" }}>50 months · Solo</span>
            <span style={{ color: "var(--fg-3)" }}>$109,700</span>
            <span style={{ color: "var(--fg)" }}>46 years · Solo</span>
            <span style={{ color: "var(--fg-3)" }}>1 disqualification</span>
            <span style={{ color: "var(--fg)" }}>incalculable</span>
          </div>
        </div>
      </section>

      <section
        style={{ borderBottom: "1px solid var(--hair)", padding: "112px 40px" }}
      >
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
            Run your first review now.
          </h2>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/scan" className="v-btn v-btn--primary v-btn--lg">
              Run a free review
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
          <Link href="/" style={navLink}>
            Platform
          </Link>
          <Link href="/scan" style={navLink}>
            Run a review
          </Link>
          <Link href="/pricing" style={{ ...navLink, color: "var(--fg)" }}>
            Pricing
          </Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/sign-in" style={navLink}>
            Sign in
          </Link>
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
