import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type ParsedDocument = {
  text: string;
  /** Page count (PDF) or section count (DOCX, when available). */
  pages?: number;
};

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
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const result = await parser.getText();
    return {
      text: result.text ?? "",
      pages: result.pages?.length ?? result.total ?? undefined,
    };
  }
  if (isDocx) {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buf),
    });
    return { text: result.value };
  }

  return { text: new TextDecoder().decode(buf) };
}
