import Link from "next/link";
import { Seal, VWordmark } from "@/components/brand/Seal";
import { CostTicker } from "@/components/marketing/CostTicker";
import { TICKER_RANGE } from "@/components/marketing/tickerRange";

export default function MarketingHome() {
  return (
    <div>
      <Nav />
      <Hero />
      <Ticker />
      <Pain />
      <Pillars />
      <Quote />
      <Compliance />
      <CTA />
      <Footer />
    </div>
  );
}

/* =================================================================
   NAV
   ================================================================= */

function Nav() {
  const items = [
    { label: "Platform", href: "/" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Security", href: "/security" },
    { label: "Pricing", href: "/pricing" },
    { label: "Resources", href: "/resources" },
  ];
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
          {items.map((i) => (
            <Link
              key={i.label}
              href={i.href}
              style={{
                color: "var(--fg-2)",
                fontSize: 13,
                textDecoration: "none",
                letterSpacing: "0.02em",
              }}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            Request demo
          </Link>
        </div>
      </div>
    </header>
  );
}

/* =================================================================
   HERO
   ================================================================= */

function Hero() {
  return (
    <section
      style={{
        borderBottom: "1px solid var(--hair)",
        padding: "120px 40px 96px",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 80,
          alignItems: "end",
        }}
      >
        <div>
          <div className="v-eyebrow" style={{ marginBottom: 32 }}>
            AI Verification Infrastructure for Law
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 96,
              fontWeight: 400,
              lineHeight: 0.96,
              letterSpacing: "-0.02em",
            }}
          >
            Trust, <span style={{ fontStyle: "italic" }}>verified.</span>
          </h1>
          <p
            style={{
              margin: "32px 0 40px",
              maxWidth: 540,
              fontSize: 17,
              lineHeight: 1.5,
              color: "var(--fg-2)",
            }}
          >
            AI is changing how legal work is drafted. Courts have not changed
            what they expect from the lawyer who signs it. Veritas verifies
            citations, validates holdings, and produces a defensible audit
            trail for every AI-assisted brief, before it leaves the firm.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/scan" className="v-btn v-btn--primary v-btn--lg">
              Upload a filing
            </Link>
            <Link
              href="/how-it-works"
              className="v-btn v-btn--secondary v-btn--lg"
            >
              How it works
            </Link>
          </div>
          <div
            style={{
              marginTop: 56,
              paddingTop: 24,
              borderTop: "1px solid var(--hair)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--fg-3)",
              textTransform: "uppercase",
            }}
          >
            Pilot cohort open · first 10 firms · hand-onboarded by the team
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div
      style={{
        border: "1px solid var(--hair-strong)",
        background: "var(--obsidian-2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid var(--hair)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
        }}
      >
        <span>Brief · §III · Argument</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: "var(--verified)",
            }}
          />
          Audit running
        </span>
      </div>
      <div
        style={{
          position: "relative",
          padding: "28px 32px",
          fontSize: 13.5,
          lineHeight: 1.7,
          color: "var(--fg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, var(--courtroom) 50%, transparent)",
            animation: "vScan 2.4s linear infinite",
          }}
        />
        <p style={{ margin: "0 0 16px" }}>
          The standard articulated in{" "}
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 6,
              padding: "1px 6px",
              border: "1px solid var(--hair-strong)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: "var(--verified)",
              }}
            />
            Daubert · 509 U.S. 579
          </span>{" "}
          governs admissibility of expert testimony.
        </p>
        <p style={{ margin: "0 0 16px" }}>
          The proposition that follows is{" "}
          <span
            style={{
              background: "rgba(184,130,48,0.10)",
              borderBottom: "1px solid var(--amber)",
              padding: "1px 4px",
            }}
          >
            not supported by the cited holding
          </span>
          .
        </p>
        <p style={{ margin: 0, color: "var(--fg-2)" }}>
          Citation{" "}
          <span
            style={{
              background: "rgba(142,43,43,0.16)",
              borderBottom: "1px solid var(--critical)",
              padding: "1px 4px",
            }}
          >
            does not appear in any reporter
          </span>
          , likely fabricated.
        </p>
      </div>
      <div
        style={{
          borderTop: "1px solid var(--hair)",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          3 findings · 1 unverified · 1 unsupported · 1 fabricated
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          Illustrative
        </span>
      </div>
    </div>
  );
}

/* =================================================================
   TICKER
   ================================================================= */

function Ticker() {
  return (
    <section
      style={{
        borderBottom: "1px solid var(--hair)",
        background: "var(--obsidian)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "96px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "end",
          }}
        >
          <div>
            <div className="v-eyebrow" style={{ marginBottom: 32 }}>
              Aggregate cost to the bar
            </div>
            <CostTicker />
            <div
              style={{
                marginTop: 24,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}
            >
              Aggregate sanctions, costs &amp; fees · U.S. courts · cumulative
              through Apr 2026
            </div>
          </div>
          <div
            style={{
              borderLeft: "1px solid var(--hair)",
              paddingLeft: 40,
              paddingBottom: 8,
              maxWidth: 480,
            }}
          >
            <h2
              style={{
                margin: "0 0 24px",
                fontFamily: "var(--font-serif)",
                fontSize: 36,
                fontWeight: 400,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              What courts have already taken back from the bar.
            </h2>
            <p
              style={{
                margin: "0 0 32px",
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--fg-2)",
              }}
            >
              The number above is our best estimate of monetary sanctions,
              cost orders, and fee-shifting awards levied on U.S. attorneys
              for filings containing AI-fabricated citations. It climbs from
              the conservative floor (publicly-reported direct sanctions
              only) to the defensible ceiling (including published cost
              orders and diverted court time).
            </p>
            <div
              style={{
                paddingTop: 20,
                borderTop: "1px solid var(--hair)",
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
                letterSpacing: "0.04em",
                lineHeight: 1.5,
              }}
            >
              <span>Range</span>
              <span style={{ color: "var(--fg-2)" }}>
                {`$${TICKER_RANGE.LOW.toLocaleString("en-US")} – $${TICKER_RANGE.HIGH.toLocaleString("en-US")}`}
              </span>
              <span>Sources</span>
              <span style={{ color: "var(--fg-2)" }}>
                <a
                  href="https://www.damiencharlotin.com/hallucinations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit" }}
                >
                  Charlotin, AI Hallucination Cases (2026)
                </a>
                ; published sanction orders in Mata v. Avianca (S.D.N.Y.
                2023), Lacey v. State Farm (C.D. Cal. 2025), Noland v. Land
                of the Free (Cal. Ct. App. 2025), and reporting by NPR (Apr.
                2026) on D. Or. sanctions.
              </span>
              <span>Method</span>
              <span style={{ color: "var(--fg-2)" }}>
                Low bound: documented direct monetary sanctions. High bound:
                adds cost orders, fee awards, and conservatively-modeled
                court &amp; opposing-counsel time.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   PAIN — REAL SANCTION CASES
   ================================================================= */

function Pain() {
  const cases = [
    {
      court: "S.D.N.Y. · 2023",
      headline: "$5,000 sanction",
      body: "Mata v. Avianca, Inc. Two attorneys submitted a brief citing six fabricated cases generated by ChatGPT. The judge wrote that he might not have sanctioned them had they come clean, but they didn't.",
      cite: "Mata v. Avianca, 678 F. Supp. 3d 443 (S.D.N.Y. 2023)",
      url: "https://www.cnbc.com/2023/06/22/judge-sanctions-lawyers-whose-ai-written-filing-contained-fake-citations.html",
    },
    {
      court: "M.D. Fla. · 2024",
      headline: "1-year federal suspension",
      body: "A Florida attorney was suspended from practicing in the Middle District of Florida after filing pleadings with cases that, in the court's words, were completely fabricated.",
      cite: "In re Neusom · 1-year suspension, March 8, 2024",
      url: "https://www.lawnext.com/2024/03/federal-court-suspends-florida-attorney-over-filing-fabricated-cases-hallucinated-by-ai.html",
    },
    {
      court: "Cal. Ct. App. · 2025",
      headline: "$10,000 · 21 of 23 quotes fabricated",
      body: "A California appellate court fined an attorney for filing an opening brief in which 21 of 23 quoted authorities were fabricated. The court published the opinion as a warning to the bar.",
      cite: "California 2nd District Court of Appeal, Sept. 2025",
      url: "https://calmatters.org/economy/technology/2025/09/chatgpt-lawyer-fine-ai-regulation/",
    },
    {
      court: "N.D. Ala. · 2025",
      headline: "Disqualified · referred to bar",
      body: "Johnson v. Dunn. A large firm's hallucinated citation led the court to disqualify the offending attorneys, publish the opinion in the Federal Supplement, and direct the clerk to notify bar regulators in every state where they were licensed.",
      cite: "Johnson v. Dunn, No. 2:21-cv-1701 (N.D. Ala., July 23, 2025)",
      url: "https://www.esquiresolutions.com/federal-court-turns-up-the-heat-on-attorneys-using-chatgpt-for-research/",
    },
    {
      court: "D. Or. · 2026",
      headline: "$109,700 in sanctions and costs",
      body: "A federal court in Oregon ordered a lawyer to pay $109,700 in sanctions and costs for filing AI-generated errors, reported as one of the largest such penalties to date.",
      cite: "Reported by NPR, April 2026",
      url: "https://www.npr.org/2026/04/03/nx-s1-5761454/penalties-stack-up-ai-spreads-through-legal-system",
    },
    {
      court: "Worldwide · ongoing",
      headline: "1,200+ documented cases",
      body: "Damien Charlotin, a researcher at HEC Paris, maintains a public database of court decisions involving AI hallucinations. By April 2026 it had logged more than 1,200 cases, roughly 800 from U.S. courts.",
      cite: "AI Hallucination Cases · damiencharlotin.com",
      url: "https://www.damiencharlotin.com/hallucinations/",
    },
  ];
  return (
    <section style={{ borderBottom: "1px solid var(--hair)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "112px 40px 96px" }}>
        <div className="v-eyebrow" style={{ marginBottom: 24 }}>
          The record so far
        </div>
        <h2
          style={{
            margin: "0 0 24px",
            fontFamily: "var(--font-serif)",
            fontSize: 56,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: 900,
          }}
        >
          Courts are no longer treating fabricated citations as a misunderstanding.
        </h2>
        <p
          style={{
            margin: "0 0 64px",
            maxWidth: 720,
            fontSize: 16,
            lineHeight: 1.55,
            color: "var(--fg-2)",
          }}
        >
          Every entry below is from the public record: a sanctioned attorney,
          a disqualified counsel, a published warning. The professional rules
          have not changed: a lawyer is responsible for every citation in a
          filing they sign, regardless of who or what produced it.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid var(--hair)",
            borderLeft: "1px solid var(--hair)",
          }}
        >
          {cases.map((c, i) => (
            <article
              key={i}
              style={{
                padding: "32px 28px",
                borderRight: "1px solid var(--hair)",
                borderBottom: "1px solid var(--hair)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                minHeight: 280,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--fg-3)",
                }}
              >
                {c.court}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 26,
                  fontWeight: 400,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                }}
              >
                {c.headline}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--fg-2)",
                  lineHeight: 1.55,
                }}
              >
                {c.body}
              </p>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: "auto",
                  paddingTop: 16,
                  borderTop: "1px solid var(--hair)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-2)",
                  lineHeight: 1.4,
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  gap: 12,
                }}
              >
                <span style={{ flex: 1 }}>{c.cite}</span>
                <span style={{ flexShrink: 0, color: "var(--fg-3)" }}>↗</span>
              </a>
            </article>
          ))}
        </div>
        <div
          style={{
            marginTop: 48,
            padding: "24px 28px",
            border: "1px solid var(--hair)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--fg-2)",
          }}
        >
          <strong style={{ color: "var(--fg)", fontWeight: 500 }}>
            The rule the courts keep returning to:
          </strong>{" "}
          if your name is on the filing, the citations are yours. Not the
          intern&apos;s. Not the AI&apos;s. Yours. Monetary fines, in the
          words of one federal court, are no longer enough to deter the
          behavior.
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   PILLARS
   ================================================================= */

function Pillars() {
  const pillars = [
    {
      n: "01",
      title: "Verify",
      body:
        "Every cited authority is matched against primary reporters, statutes, and court rules. We confirm the case exists, that the holding is what counsel says it is, and that the proposition is actually supported.",
      points: [
        "Reporter lookup",
        "Holding-to-proposition matching",
        "Negative treatment surfacing",
      ],
    },
    {
      n: "02",
      title: "Audit",
      body:
        "Every action, by a human, by a model, by a tool, is timestamped, hashed, and bound to the filing. The audit trail is exportable as a signed PDF that travels with the brief.",
      points: [
        "SHA-256 evidence chain",
        "Per-paragraph provenance",
        "Court-ready export",
      ],
    },
    {
      n: "03",
      title: "Defend",
      body:
        "Stress-test the brief adversarially before opposing counsel does. Surface unsupported propositions, weakened precedent, and authority you may have omitted.",
      points: [
        "Adversarial review",
        "Weakness scoring",
        "Defensibility report",
      ],
    },
  ];
  return (
    <section style={{ borderBottom: "1px solid var(--hair)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "112px 40px" }}>
        <div className="v-eyebrow" style={{ marginBottom: 24 }}>
          What Veritas does
        </div>
        <h2
          style={{
            margin: "0 0 24px",
            fontFamily: "var(--font-serif)",
            fontSize: 56,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: 800,
          }}
        >
          A verification layer between AI output and the courthouse door.
        </h2>
        <p
          style={{
            margin: "0 0 80px",
            maxWidth: 680,
            fontSize: 16,
            lineHeight: 1.55,
            color: "var(--fg-2)",
          }}
        >
          We are not a drafting tool. We are not an assistant. We sit between
          whatever tool your firm already uses and the filing your name will
          appear on, and we make sure the work is defensible.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
            borderTop: "1px solid var(--hair)",
          }}
        >
          {pillars.map((p, i) => (
            <div
              key={p.n}
              style={{
                padding: "40px 32px 0",
                borderRight: i < 2 ? "1px solid var(--hair)" : 0,
                minHeight: 420,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    color: "var(--fg-3)",
                  }}
                >
                  {p.n}
                </span>
                <span
                  style={{
                    width: 24,
                    height: 1,
                    background: "var(--hair-strong)",
                  }}
                />
              </div>
              <h3
                style={{
                  margin: "0 0 16px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  margin: "0 0 32px",
                  color: "var(--fg-2)",
                  fontSize: 15,
                  lineHeight: 1.55,
                }}
              >
                {p.body}
              </p>
              <ul
                style={{
                  margin: "auto 0 32px",
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {p.points.map((pt) => (
                  <li
                    key={pt}
                    style={{
                      padding: "12px 0",
                      borderTop: "1px solid var(--hair)",
                      fontSize: 13,
                      color: "var(--fg-2)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{pt}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--fg-3)",
                      }}
                    >
                      ·
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   QUOTE
   ================================================================= */

function Quote() {
  return (
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
          padding: "112px 40px",
        }}
      >
        <div className="v-eyebrow" style={{ marginBottom: 40 }}>
          From a published court opinion
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 36,
            fontWeight: 400,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          &ldquo;No brief, pleading, motion, or any other paper filed in any
          court should contain any citations, whether provided by generative
          AI or any other source, that the attorney responsible for
          submitting the pleading has not personally read and{" "}
          <span style={{ fontStyle: "italic" }}>verified</span>.&rdquo;
        </p>
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--hair)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              California 2nd District Court of Appeal
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
              Noland v. Land of the Free, L.P. · B331918 · Sept. 12, 2025
            </div>
          </div>
          <a
            href="https://law.justia.com/cases/california/court-of-appeal/2025/b331918.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-2)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              textDecoration: "none",
            }}
          >
            Read the opinion ↗
          </a>
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   COMPLIANCE
   ================================================================= */

function Compliance() {
  const items = [
    "SOC 2 Type II (in audit)",
    "Privileged Cloud",
    "Per-Matter Encryption",
    "EU Data Residency",
    "On-Prem Available",
  ];
  return (
    <section
      style={{
        borderBottom: "1px solid var(--hair)",
        padding: "48px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        <span className="v-eyebrow">Built for privileged work</span>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {items.map((i) => (
            <span key={i} className="v-badge v-badge--neutral">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   CTA
   ================================================================= */

function CTA() {
  return (
    <section
      style={{
        borderBottom: "1px solid var(--hair)",
        padding: "112px 40px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2
          style={{
            margin: "0 0 32px",
            fontFamily: "var(--font-serif)",
            fontSize: 72,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          Verify before you file.
        </h2>
        <p
          style={{
            margin: "0 0 40px",
            fontSize: 17,
            color: "var(--fg-2)",
            maxWidth: 580,
            lineHeight: 1.55,
          }}
        >
          Pilots begin with a single practice group and a real matter. Bring
          a brief. We&apos;ll show you what a defensibility report looks
          like for your own work.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/scan" className="v-btn v-btn--primary v-btn--lg">
            Upload a filing
          </Link>
          <Link
            href="/sample-report"
            className="v-btn v-btn--secondary v-btn--lg"
          >
            See a sample report
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   FOOTER
   ================================================================= */

function Footer() {
  const cols = [
    { h: "Platform", items: ["Verification", "Audit", "Adversarial Review", "API"] },
    { h: "For", items: ["Law Firms", "In-House", "Government"] },
    { h: "Resources", items: ["Methodology", "Security", "Status"] },
    { h: "Company", items: ["About", "Careers", "Contact"] },
  ];
  return (
    <footer style={{ padding: "64px 40px 32px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr",
            gap: 48,
            paddingBottom: 48,
            borderBottom: "1px solid var(--hair)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <Seal size={22} />
              <VWordmark />
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--fg-3)",
                maxWidth: 280,
                lineHeight: 1.6,
              }}
            >
              AI Verification Infrastructure for Law. Built for scrutiny.
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="v-eyebrow" style={{ marginBottom: 20 }}>
                {c.h}
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {c.items.map((i) => (
                  <li key={i}>
                    <a
                      href="#"
                      style={{
                        fontSize: 13,
                        color: "var(--fg-2)",
                        textDecoration: "none",
                      }}
                    >
                      {i}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            letterSpacing: "0.04em",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>© 2026 Veritas, Inc. · Confidential. Built for privileged work.</span>
          <span>Trust, verified.</span>
        </div>
      </div>
    </footer>
  );
}
