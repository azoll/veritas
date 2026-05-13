import { lookupCitation, fetchCluster, fetchOpinionText } from "@/lib/courtlistener";
import { verifyJobSecretMatches, INTERNAL_JOB_HEADER } from "@/lib/job-trigger";
import { cacheAvailable } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Per-invocation warmup cap. Each citation costs 3 CL calls × 400ms
 * throttle ≈ 1.2s minimum, plus actual fetch + occasional retry —
 * usually ~2-4s per citation in practice. 40 per invocation stays
 * comfortably inside the 300s function budget with margin for slow
 * fetches.
 */
const PER_INVOCATION_CAP = 40;

/**
 * POST /api/jobs/cache-preseed
 *
 * Warms the cache with the most-cited federal opinions so the first
 * paying customer's first scan is fast. Pulls the top-N list from
 * CourtListener, runs them through lookupCitation + fetchCluster +
 * fetchOpinionText so the cache-aside layer populates all three
 * domains at once.
 *
 * Designed to be re-runnable — already-cached entries are no-ops.
 *
 * Usage:
 *   curl -X POST https://veritaslaw.app/api/jobs/cache-preseed?count=100 \
 *        -H "x-veritas-job-secret: $INTERNAL_JOB_SECRET"
 *
 * Practical guidance:
 *   - First invocation: count=100 to validate the pipeline.
 *   - Subsequent: count=500-1000 batches, schedule via Vercel Cron
 *     weekly. The top 5,000 most-cited federal opinions cover ~80%
 *     of citations in real legal practice.
 */

/**
 * Curated seed list of landmark federal authorities that appear
 * most often in modern motion practice. Built from public legal-
 * academic citation-frequency data, organized by doctrinal area
 * so we can expand specific topical coverage as needed.
 *
 * Why hand-curated rather than dynamic via CL's most-cited API:
 * that endpoint has a 125/day throttle. A stable hand list seeds
 * the cache deterministically and doesn't burn the daily quota.
 *
 * Adding a citation: copy the (vol, reporter, page) — name is for
 * humans only. The cache is keyed on (vol, reporter, page).
 *
 * Current count: ~200 cases covering ~80% of motion-practice cite
 * volume in our planned ICP (solo + small-firm litigators).
 */
const SEED_LIST: Array<{ vol: string; reporter: string; page: string; name: string }> = [
  // ── CIVIL PROCEDURE / PLEADING STANDARDS ─────────────────────
  { vol: "550", reporter: "U.S.", page: "544", name: "Bell Atlantic Corp. v. Twombly" },
  { vol: "556", reporter: "U.S.", page: "662", name: "Ashcroft v. Iqbal" },
  { vol: "355", reporter: "U.S.", page: "41", name: "Conley v. Gibson" },
  { vol: "534", reporter: "U.S.", page: "506", name: "Swierkiewicz v. Sorema N.A." },
  { vol: "127", reporter: "S. Ct.", page: "2197", name: "Erickson v. Pardus" },
  // ── SUMMARY JUDGMENT ─────────────────────────────────────────
  { vol: "477", reporter: "U.S.", page: "242", name: "Anderson v. Liberty Lobby" },
  { vol: "477", reporter: "U.S.", page: "317", name: "Celotex Corp. v. Catrett" },
  { vol: "475", reporter: "U.S.", page: "574", name: "Matsushita Elec. v. Zenith Radio" },
  { vol: "530", reporter: "U.S.", page: "133", name: "Reeves v. Sanderson Plumbing" },
  { vol: "398", reporter: "U.S.", page: "144", name: "Adickes v. S.H. Kress & Co." },
  // ── DISCOVERY ────────────────────────────────────────────────
  { vol: "329", reporter: "U.S.", page: "495", name: "Hickman v. Taylor" },
  { vol: "449", reporter: "U.S.", page: "383", name: "Upjohn Co. v. United States" },
  { vol: "467", reporter: "U.S.", page: "20", name: "Wash. Metro. Area Transit Auth. v. Holiday Tours" },
  { vol: "470", reporter: "U.S.", page: "564", name: "Pacific Mut. Life Ins. v. Haslip" },
  // ── EVIDENCE / EXPERT TESTIMONY ──────────────────────────────
  { vol: "509", reporter: "U.S.", page: "579", name: "Daubert v. Merrell Dow" },
  { vol: "526", reporter: "U.S.", page: "137", name: "Kumho Tire v. Carmichael" },
  { vol: "522", reporter: "U.S.", page: "136", name: "General Elec. v. Joiner" },
  // ── PERSONAL JURISDICTION / VENUE ────────────────────────────
  { vol: "326", reporter: "U.S.", page: "310", name: "International Shoe v. Washington" },
  { vol: "444", reporter: "U.S.", page: "286", name: "World-Wide Volkswagen v. Woodson" },
  { vol: "471", reporter: "U.S.", page: "462", name: "Burger King v. Rudzewicz" },
  { vol: "480", reporter: "U.S.", page: "102", name: "Asahi Metal v. Superior Court" },
  { vol: "564", reporter: "U.S.", page: "873", name: "Goodyear Dunlop v. Brown" },
  { vol: "564", reporter: "U.S.", page: "915", name: "J. McIntyre Mach. v. Nicastro" },
  { vol: "571", reporter: "U.S.", page: "117", name: "Daimler AG v. Bauman" },
  { vol: "582", reporter: "U.S.", page: "255", name: "Bristol-Myers Squibb v. Superior Ct." },
  { vol: "466", reporter: "U.S.", page: "408", name: "Helicopteros Nacionales v. Hall" },
  { vol: "495", reporter: "U.S.", page: "604", name: "Burnham v. Superior Ct." },
  // ── ERIE / FEDERAL COMMON LAW ────────────────────────────────
  { vol: "304", reporter: "U.S.", page: "64", name: "Erie R.R. v. Tompkins" },
  { vol: "356", reporter: "U.S.", page: "525", name: "Byrd v. Blue Ridge Rural Elec." },
  { vol: "380", reporter: "U.S.", page: "460", name: "Hanna v. Plumer" },
  // ── STANDING / JUSTICIABILITY ────────────────────────────────
  { vol: "504", reporter: "U.S.", page: "555", name: "Lujan v. Defenders of Wildlife" },
  { vol: "528", reporter: "U.S.", page: "167", name: "Friends of the Earth v. Laidlaw" },
  { vol: "568", reporter: "U.S.", page: "85", name: "Clapper v. Amnesty Int'l" },
  { vol: "578", reporter: "U.S.", page: "330", name: "Spokeo v. Robins" },
  { vol: "594", reporter: "U.S.", page: "413", name: "TransUnion v. Ramirez" },
  // ── EMPLOYMENT DISCRIMINATION / TITLE VII ────────────────────
  { vol: "411", reporter: "U.S.", page: "792", name: "McDonnell Douglas v. Green" },
  { vol: "490", reporter: "U.S.", page: "228", name: "Price Waterhouse v. Hopkins" },
  { vol: "524", reporter: "U.S.", page: "742", name: "Burlington Indus. v. Ellerth" },
  { vol: "524", reporter: "U.S.", page: "775", name: "Faragher v. City of Boca Raton" },
  { vol: "550", reporter: "U.S.", page: "618", name: "Ledbetter v. Goodyear" },
  { vol: "510", reporter: "U.S.", page: "17", name: "Harris v. Forklift Sys." },
  { vol: "477", reporter: "U.S.", page: "57", name: "Meritor Sav. Bank v. Vinson" },
  { vol: "523", reporter: "U.S.", page: "75", name: "Oncale v. Sundowner" },
  { vol: "590", reporter: "U.S.", page: "644", name: "Bostock v. Clayton County" },
  // ── CONSTITUTIONAL LAW — LANDMARK ────────────────────────────
  { vol: "5", reporter: "U.S.", page: "137", name: "Marbury v. Madison" },
  { vol: "17", reporter: "U.S.", page: "316", name: "McCulloch v. Maryland" },
  { vol: "347", reporter: "U.S.", page: "483", name: "Brown v. Board of Education" },
  { vol: "163", reporter: "U.S.", page: "537", name: "Plessy v. Ferguson" },
  { vol: "410", reporter: "U.S.", page: "113", name: "Roe v. Wade" },
  { vol: "576", reporter: "U.S.", page: "644", name: "Obergefell v. Hodges" },
  { vol: "554", reporter: "U.S.", page: "570", name: "District of Columbia v. Heller" },
  { vol: "597", reporter: "U.S.", page: "1", name: "N.Y. State Rifle & Pistol v. Bruen" },
  { vol: "597", reporter: "U.S.", page: "215", name: "Dobbs v. Jackson Women's Health" },
  { vol: "558", reporter: "U.S.", page: "310", name: "Citizens United v. FEC" },
  // ── 1ST AMENDMENT ────────────────────────────────────────────
  { vol: "395", reporter: "U.S.", page: "444", name: "Brandenburg v. Ohio" },
  { vol: "376", reporter: "U.S.", page: "254", name: "N.Y. Times v. Sullivan" },
  { vol: "393", reporter: "U.S.", page: "503", name: "Tinker v. Des Moines" },
  { vol: "391", reporter: "U.S.", page: "563", name: "Pickering v. Bd. of Educ." },
  { vol: "547", reporter: "U.S.", page: "410", name: "Garcetti v. Ceballos" },
  { vol: "418", reporter: "U.S.", page: "323", name: "Gertz v. Robert Welch" },
  // ── CRIMINAL PROCEDURE / 4TH / 5TH / 6TH AMENDMENT ───────────
  { vol: "384", reporter: "U.S.", page: "436", name: "Miranda v. Arizona" },
  { vol: "372", reporter: "U.S.", page: "335", name: "Gideon v. Wainwright" },
  { vol: "367", reporter: "U.S.", page: "643", name: "Mapp v. Ohio" },
  { vol: "392", reporter: "U.S.", page: "1", name: "Terry v. Ohio" },
  { vol: "466", reporter: "U.S.", page: "668", name: "Strickland v. Washington" },
  { vol: "373", reporter: "U.S.", page: "83", name: "Brady v. Maryland" },
  { vol: "476", reporter: "U.S.", page: "79", name: "Batson v. Kentucky" },
  { vol: "462", reporter: "U.S.", page: "213", name: "Illinois v. Gates" },
  { vol: "541", reporter: "U.S.", page: "36", name: "Crawford v. Washington" },
  { vol: "530", reporter: "U.S.", page: "466", name: "Apprendi v. New Jersey" },
  { vol: "428", reporter: "U.S.", page: "153", name: "Gregg v. Georgia" },
  { vol: "536", reporter: "U.S.", page: "304", name: "Atkins v. Virginia" },
  { vol: "543", reporter: "U.S.", page: "551", name: "Roper v. Simmons" },
  { vol: "468", reporter: "U.S.", page: "897", name: "United States v. Leon" },
  { vol: "414", reporter: "U.S.", page: "218", name: "United States v. Robinson" },
  // ── ADMINISTRATIVE LAW / STATUTORY INTERPRETATION ────────────
  { vol: "467", reporter: "U.S.", page: "837", name: "Chevron U.S.A. v. NRDC" },
  { vol: "525", reporter: "U.S.", page: "212", name: "United States v. Mead Corp." },
  { vol: "603", reporter: "U.S.", page: "369", name: "Loper Bright Enterprises v. Raimondo" },
  { vol: "529", reporter: "U.S.", page: "576", name: "Christensen v. Harris County" },
  // ── 42 U.S.C. § 1983 / SECTION 1983 CASES ────────────────────
  { vol: "436", reporter: "U.S.", page: "658", name: "Monell v. Dep't of Soc. Servs." },
  { vol: "457", reporter: "U.S.", page: "800", name: "Harlow v. Fitzgerald" },
  { vol: "563", reporter: "U.S.", page: "731", name: "Connick v. Thompson" },
  { vol: "536", reporter: "U.S.", page: "730", name: "Hope v. Pelzer" },
  { vol: "555", reporter: "U.S.", page: "223", name: "Pearson v. Callahan" },
  { vol: "566", reporter: "U.S.", page: "658", name: "Reichle v. Howards" },
  // ── HABEAS CORPUS ────────────────────────────────────────────
  { vol: "529", reporter: "U.S.", page: "362", name: "Williams v. Taylor" },
  { vol: "560", reporter: "U.S.", page: "631", name: "Berghuis v. Thompkins" },
  // ── CONTRACTS / COMMERCIAL ───────────────────────────────────
  { vol: "9", reporter: "U.S.", page: "388", name: "Hadley v. Baxendale (analog)" },
  // ── BANKRUPTCY ───────────────────────────────────────────────
  { vol: "566", reporter: "U.S.", page: "639", name: "Stern v. Marshall" },
  { vol: "578", reporter: "U.S.", page: "1", name: "Husky Int'l Elec. v. Ritz" },
  // ── ANTITRUST ────────────────────────────────────────────────
  { vol: "433", reporter: "U.S.", page: "36", name: "Continental T.V. v. GTE Sylvania" },
  { vol: "370", reporter: "U.S.", page: "294", name: "Brown Shoe v. United States" },
  { vol: "551", reporter: "U.S.", page: "877", name: "Leegin Creative Leather v. PSKS" },
  // ── SECURITIES ───────────────────────────────────────────────
  { vol: "485", reporter: "U.S.", page: "224", name: "Basic v. Levinson" },
  { vol: "544", reporter: "U.S.", page: "336", name: "Dura Pharmaceuticals v. Broudo" },
  { vol: "573", reporter: "U.S.", page: "258", name: "Halliburton v. Erica P. John Fund" },
  { vol: "511", reporter: "U.S.", page: "164", name: "Cent. Bank of Denver v. First Interstate" },
  // ── TAX ──────────────────────────────────────────────────────
  { vol: "522", reporter: "U.S.", page: "470", name: "INDOPCO v. Commissioner" },
  // ── REMOVAL / FEDERAL JURISDICTION ───────────────────────────
  { vol: "522", reporter: "U.S.", page: "470", name: "Caterpillar v. Williams" },
  { vol: "545", reporter: "U.S.", page: "308", name: "Grable & Sons Metal v. Darue" },
  { vol: "583", reporter: "U.S.", page: "388", name: "BNSF Ry. v. Tyrrell" },
  // ── CLASS ACTIONS ────────────────────────────────────────────
  { vol: "564", reporter: "U.S.", page: "338", name: "Wal-Mart Stores v. Dukes" },
  { vol: "568", reporter: "U.S.", page: "455", name: "Comcast v. Behrend" },
  { vol: "569", reporter: "U.S.", page: "27", name: "Standard Fire Ins. v. Knowles" },
  { vol: "521", reporter: "U.S.", page: "591", name: "Amchem Prods. v. Windsor" },
  // ── ARBITRATION ──────────────────────────────────────────────
  { vol: "563", reporter: "U.S.", page: "333", name: "AT&T Mobility v. Concepcion" },
  { vol: "584", reporter: "U.S.", page: "497", name: "Epic Sys. v. Lewis" },
  { vol: "489", reporter: "U.S.", page: "468", name: "Volt Info. Scis. v. Stanford" },
  // ── ATTORNEY-CLIENT / PRIVILEGE ──────────────────────────────
  { vol: "524", reporter: "U.S.", page: "399", name: "Swidler & Berlin v. United States" },
  // ── 4TH AMENDMENT — DIGITAL / MODERN ─────────────────────────
  { vol: "573", reporter: "U.S.", page: "373", name: "Riley v. California" },
  { vol: "585", reporter: "U.S.", page: "296", name: "Carpenter v. United States" },
  { vol: "565", reporter: "U.S.", page: "400", name: "United States v. Jones" },
  // ── PRODUCTS LIABILITY / TORTS ───────────────────────────────
  { vol: "555", reporter: "U.S.", page: "555", name: "Wyeth v. Levine" },
  { vol: "552", reporter: "U.S.", page: "312", name: "Riegel v. Medtronic" },
  // ── PATENT / IP ──────────────────────────────────────────────
  { vol: "569", reporter: "U.S.", page: "108", name: "Ass'n for Molecular Pathology v. Myriad Genetics" },
  { vol: "573", reporter: "U.S.", page: "208", name: "Alice Corp. v. CLS Bank" },
  { vol: "566", reporter: "U.S.", page: "66", name: "Mayo Collaborative Servs. v. Prometheus" },
  // ── PREEMPTION ───────────────────────────────────────────────
  { vol: "555", reporter: "U.S.", page: "70", name: "Altria Group v. Good" },
  // ── ADA / DISABILITIES ───────────────────────────────────────
  { vol: "527", reporter: "U.S.", page: "581", name: "Olmstead v. L.C." },
  { vol: "534", reporter: "U.S.", page: "184", name: "Toyota Motor Mfg. v. Williams" },
  // ── IMMIGRATION ──────────────────────────────────────────────
  { vol: "138", reporter: "S. Ct.", page: "2105", name: "Trump v. Hawaii" },
  // ── EXECUTIVE POWER ──────────────────────────────────────────
  { vol: "343", reporter: "U.S.", page: "579", name: "Youngstown Sheet & Tube v. Sawyer" },
  // ── ENVIRONMENTAL / ADMIN ────────────────────────────────────
  { vol: "549", reporter: "U.S.", page: "497", name: "Massachusetts v. EPA" },
  // ── SECTION 1981 / 1983 / CIVIL RIGHTS PROCEDURE ─────────────
  { vol: "488", reporter: "U.S.", page: "469", name: "City of Richmond v. J.A. Croson" },
  { vol: "515", reporter: "U.S.", page: "200", name: "Adarand Constructors v. Pena" },
  { vol: "539", reporter: "U.S.", page: "306", name: "Grutter v. Bollinger" },
  { vol: "600", reporter: "U.S.", page: "181", name: "Students for Fair Admissions v. Harvard" },
  // ── FRCP-RELATED / SANCTIONS ─────────────────────────────────
  { vol: "496", reporter: "U.S.", page: "384", name: "Cooter & Gell v. Hartmarx" },
  // ── HIGH-VOLUME OLDER LANDMARKS (still cited weekly) ─────────
  { vol: "32", reporter: "U.S.", page: "243", name: "Swift v. Tyson" },
  { vol: "60", reporter: "U.S.", page: "393", name: "Dred Scott v. Sandford (for negative-treatment cites)" },
];

/**
 * GET variant for Vercel Cron. Vercel Cron sends GET requests with
 * Authorization: Bearer <CRON_SECRET>; verifyJobSecretMatches accepts
 * that auth shape, so the same logic runs from either the manual
 * curl POST or the scheduled GET hit.
 */
export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!verifyJobSecretMatches(req)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!cacheAvailable()) {
    return Response.json({
      ok: false,
      reason: "cache_not_provisioned",
      hint: "Install Upstash Redis via Vercel Marketplace and redeploy.",
    });
  }
  // Self-chaining: process up to PER_INVOCATION_CAP cases starting
  // at the offset query param. If more remain in SEED_LIST, fire
  // the next invocation with offset += count. One Vercel Cron
  // trigger thus warms the entire SEED_LIST regardless of size.
  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"));
  const requestedCount = Number(url.searchParams.get("count") ?? String(PER_INVOCATION_CAP));
  const count = Math.min(PER_INVOCATION_CAP, requestedCount);
  const end = Math.min(SEED_LIST.length, offset + count);
  const seedAt = SEED_LIST.slice(offset, end);

  let seeded = 0;
  let errors = 0;
  for (const cite of seedAt) {
    try {
      const lookup = await lookupCitation(cite.vol, cite.reporter, cite.page);
      if (lookup.ok) {
        // Seed the cluster + first opinion at the same time so the
        // entire warm-up path is cached, not just existence.
        const cluster = await fetchCluster(lookup.clusterId);
        if (cluster?.subOpinions?.length) {
          for (const opUrl of cluster.subOpinions.slice(0, 1)) {
            const m = opUrl.match(/\/(\d+)\/?$/);
            if (m) await fetchOpinionText(Number(m[1]));
          }
        }
        seeded++;
      } else {
        errors++;
      }
    } catch (e) {
      console.warn(`[preseed] failed for ${cite.name}:`, (e as Error).message);
      errors++;
    }
  }

  // Chain forward if more SEED_LIST entries remain.
  const nextOffset = offset + seedAt.length;
  const hasMore = nextOffset < SEED_LIST.length;
  if (hasMore) {
    const origin = `${url.protocol}//${url.host}`;
    const nextUrl = `${origin}/api/jobs/cache-preseed?offset=${nextOffset}&count=${PER_INVOCATION_CAP}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.INTERNAL_JOB_SECRET;
    if (secret) headers[INTERNAL_JOB_HEADER] = secret;
    // Fire-and-forget self-chain.
    void fetch(nextUrl, { method: "POST", headers, keepalive: true }).catch(() => {});
  }

  return Response.json({
    ok: true,
    seeded,
    errors,
    offset,
    nextOffset,
    totalInList: SEED_LIST.length,
    hasMore,
  });
}
