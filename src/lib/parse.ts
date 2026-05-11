import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export type ParsedDocument = {
  text: string;
  /** Page count (PDF) or section count (DOCX, when available). */
  pages?: number;
};

/**
 * Parse a brief into plain text for citation extraction.
 *
 * - PDF: routed through `unpdf` rather than `pdf-parse`. Both wrap pdfjs,
 *   but unpdf is specifically built for serverless Node runtimes (no
 *   browser-global dependencies like `DOMMatrix`, `Path2D`, `ImageData`
 *   that crash on Vercel Fluid Compute).
 * - DOCX: mammoth, which is pure-JS and serverless-safe.
 * - Fallback: treat as UTF-8 text.
 */
export async function parseDocument(
  buf: ArrayBuffer,
  mime: string,
  filename: string,
): Promise<ParsedDocument> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const isPdf = mime === "application/pdf" || ext === "pdf";
  const isDocx =
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx";

  if (isPdf) {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    return { text, pages: result.totalPages };
  }
  if (isDocx) {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buf),
    });
    return { text: result.value };
  }

  return { text: new TextDecoder().decode(buf) };
}
