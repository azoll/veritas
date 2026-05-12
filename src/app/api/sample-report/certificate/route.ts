import { renderCertificateHtml, type CertificateData } from "@/lib/certificate";
import type { schema } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Public sample-certificate endpoint. Returns the same HTML the real
 * /api/documents/:id/certificate route produces, but built from the
 * curated data baked into /sample-report so prospects can preview
 * what their own certificate will look like without uploading.
 *
 * The data mirrors the in-page sample so the marketing report and
 * the marketing certificate tell the same story.
 */

type Doc = typeof schema.documents.$inferSelect;
type Cit = typeof schema.citations.$inferSelect;
type Ver = typeof schema.verifications.$inferSelect;

const FAKE_TS = new Date("2026-05-13T01:30:00Z");

const doc: Doc = {
  id: "sample",
  firmId: "sample",
  teamId: "sample",
  uploadedById: "sample",
  title: "Motion to Compel Discovery (sample brief)",
  filename: "motion-to-compel.pdf",
  mimeType: "application/pdf",
  blobUrl: "",
  sizeBytes: 0,
  rawText: "",
  status: "ready",
  error: null,
  deepScan: true,
  trialSessionId: null,
  expiresAt: null,
  contentHash:
    "9d2b3a4c5e6f7081a2b3c4d5e6f7081a2b3c4d5e6f7081a2b3c4d5e6f7081a2b",
  certificateToken: "sample-token-public-marketing-page",
  citationCount: 4,
  verifiedCount: 1,
  warningCount: 1,
  riskCount: 2,
  confidenceScore: 38,
  createdAt: FAKE_TS,
  updatedAt: FAKE_TS,
} as unknown as Doc;

const citations: Cit[] = [
  {
    id: "sample-halverson",
    documentId: "sample",
    firmId: "sample",
    rawText:
      "Halverson v. Pacific Western Mutual, 547 F.4th 1182, 1191 (9th Cir. 2024)",
    normalized: "547 F.4th 1182, 1191",
    caseName: "Halverson v. Pacific Western Mutual,",
    reporter: "F.4th",
    volume: "547",
    page: "1182",
    pinpointPage: "1191",
    court: "9th Cir.",
    year: 2024,
    startOffset: 1384,
    endOffset: 1457,
    contextSnippet: "",
    verdict: "risk",
    notes: "No opinion published at this citation — possible fabrication.",
    createdAt: FAKE_TS,
  },
  {
    id: "sample-upjohn",
    documentId: "sample",
    firmId: "sample",
    rawText: "Upjohn Co. v. United States, 449 U.S. 383, 392 (1981)",
    normalized: "449 U.S. 383, 392",
    caseName: "Upjohn Co. v. United States,",
    reporter: "U.S.",
    volume: "449",
    page: "383",
    pinpointPage: "392",
    court: null,
    year: 1981,
    startOffset: 2000,
    endOffset: 2050,
    contextSnippet: "",
    verdict: "risk",
    notes: null,
    createdAt: FAKE_TS,
  },
  {
    id: "sample-daubert",
    documentId: "sample",
    firmId: "sample",
    rawText:
      "Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579, 596 (1993)",
    normalized: "509 U.S. 579, 596",
    caseName: "See Daubert v. Merrell Dow Pharmaceuticals, Inc.,",
    reporter: "U.S.",
    volume: "509",
    page: "579",
    pinpointPage: "596",
    court: null,
    year: 1993,
    startOffset: 2600,
    endOffset: 2680,
    contextSnippet: "",
    verdict: "warning",
    notes: null,
    createdAt: FAKE_TS,
  },
  {
    id: "sample-hickman",
    documentId: "sample",
    firmId: "sample",
    rawText: "Hickman v. Taylor, 329 U.S. 495, 507 (1947)",
    normalized: "329 U.S. 495, 507",
    caseName: "Hickman v. Taylor,",
    reporter: "U.S.",
    volume: "329",
    page: "495",
    pinpointPage: "507",
    court: null,
    year: 1947,
    startOffset: 812,
    endOffset: 855,
    contextSnippet: "",
    verdict: "verified",
    notes: null,
    createdAt: FAKE_TS,
  },
];

const verifications: Ver[] = [
  {
    id: "v-halverson-existence",
    citationId: "sample-halverson",
    documentId: "sample",
    kind: "existence",
    verdict: "risk",
    source: "courtlistener:citation-lookup",
    sourceUrl: null,
    detail:
      "No opinion is published at 547 F.4th 1182 in CourtListener's corpus.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
  {
    id: "v-upjohn-pincite",
    citationId: "sample-upjohn",
    documentId: "sample",
    kind: "pincite",
    verdict: "risk",
    source: "courtlistener:opinion/110374",
    sourceUrl: null,
    detail: "Quoted language was not located in the cited opinion.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
  {
    id: "v-upjohn-proposition",
    citationId: "sample-upjohn",
    documentId: "sample",
    kind: "proposition",
    verdict: "risk",
    source: "courtlistener:opinion/110374",
    sourceUrl: null,
    detail:
      "Cited authority may run contrary to the asserted proposition. Upjohn is the leading case on attorney-client privilege in the corporate context; it does not address discovery sanctions.",
    model: "anthropic/claude-sonnet-4.6",
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
  {
    id: "v-daubert-proposition",
    citationId: "sample-daubert",
    documentId: "sample",
    kind: "proposition",
    verdict: "warning",
    source: "courtlistener:opinion/112903",
    sourceUrl: null,
    detail:
      "Support for the asserted proposition was not located in the cited opinion. Daubert addresses expert testimony admissibility under FRE 702.",
    model: "anthropic/claude-sonnet-4.6",
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
  {
    id: "v-hickman-existence",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "existence",
    verdict: "verified",
    source: "courtlistener:citation-lookup",
    sourceUrl: null,
    detail: "Located Hickman v. Taylor at 329 U.S. 495.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
  {
    id: "v-hickman-pincite",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "pincite",
    verdict: "verified",
    source: "courtlistener:opinion/103693",
    sourceUrl: null,
    detail: "Quoted language located in the cited opinion.",
    model: null,
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
  {
    id: "v-hickman-proposition",
    citationId: "sample-hickman",
    documentId: "sample",
    kind: "proposition",
    verdict: "verified",
    source: "courtlistener:opinion/103693",
    sourceUrl: null,
    detail: "Proposition appears supported.",
    model: "anthropic/claude-sonnet-4.6",
    promptHash: null,
    raw: null as never,
    createdAt: FAKE_TS,
  },
];

const data: CertificateData = {
  document: doc,
  citations,
  verifications,
  token: "sample-token-public-marketing-page",
  riskScore: 62,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const publicUrl = `${url.protocol}//${url.host}`;
  const html = renderCertificateHtml(data, { publicUrl });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
