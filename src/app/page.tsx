import Link from "next/link";
import { VeritasMark, WordmarkInline } from "@/components/brand/Wordmark";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <WordmarkInline />
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/sign-in" className="text-muted hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-sm bg-ink px-4 py-2 text-paper hover:bg-line"
            >
              Request access
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b hairline">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border hairline px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Trust Infrastructure for AI-Assisted Law
          </div>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            AI can draft a brief in minutes.
            <br />
            <span className="text-muted">Trust still takes hours.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted">
            Veritas is the verification, adversarial review, and audit layer
            for AI-assisted legal work. Every citation checked. Every quote
            verified. Every action logged. Before it leaves the firm.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-sm bg-ink px-6 py-3 text-paper hover:bg-line"
            >
              Request access
            </Link>
            <Link
              href="#how"
              className="rounded-sm border hairline px-6 py-3 text-ink hover:bg-paper-2"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="border-b hairline bg-paper-2">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-black/10 md:grid-cols-3">
          {[
            {
              k: "01",
              t: "Citation Integrity",
              b: "Every cite verified against real opinions. Hallucinated cases, fake reporters, and bad pincites surface before filing.",
            },
            {
              k: "02",
              t: "Adversarial Review",
              b: "An opposing-counsel AI attacks your filing — finds gaps, contradictions, and omitted authority you'd otherwise miss.",
            },
            {
              k: "03",
              t: "Defensible Audit",
              b: "Every model, source, and reviewer step is logged. A complete provenance trail when courts ask how the work was made.",
            },
          ].map((p) => (
            <div key={p.k} className="bg-paper p-10">
              <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-gold-2">
                <VeritasMark className="h-4" />
                {p.k}
              </div>
              <h3 className="font-display text-2xl">{p.t}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b hairline">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mx-auto mb-6 h-px w-16 bg-gold" />
          <p className="font-display text-3xl leading-snug md:text-4xl">
            “Drafting is cheap. Trust is expensive. Veritas competes to
            certify truth.”
          </p>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted">
        <span>© {new Date().getFullYear()} Veritas</span>
        <span className="uppercase tracking-[0.3em]">Trust. Verified.</span>
      </footer>
    </div>
  );
}
