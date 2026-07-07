import "server-only";
import { getAIProvider } from "@/lib/ai";
import type { AIFilePart } from "@/lib/ai/types";
import { cleanExtractedText } from "./normalize";

/**
 * Vision OCR through the configured AI provider. Used for images and for
 * PDFs with no usable text layer (scans). PDFs are split into small chunks
 * so each call stays within provider limits.
 */

const OCR_SYSTEM = `You are a precise OCR engine for exam documents.
Transcribe ALL visible text exactly as printed, in reading order.
Rules:
- Preserve question numbers, option labels (A/B/C/D), tables and answer keys.
- Do NOT correct, complete, solve, or invent anything. Transcribe only.
- If a region is illegible, write [illegible] in its place.
- Separate pages with a line containing exactly: [[Page N]] (N = page number given).`;

// Small chunks keep dense scans inside the output-token budget; truncation is
// detected via finishReason and surfaced as a warning instead of silent loss.
export const OCR_PAGES_PER_CHUNK = 4;

export interface OCRResult {
  text: string;
  truncated: boolean;
}

export async function ocrImage(buffer: Buffer, mimeType: string): Promise<OCRResult> {
  const provider = getAIProvider();
  const part: AIFilePart = {
    type: "file",
    mediaType: mimeType,
    data: buffer.toString("base64"),
  };
  const result = await provider.complete({
    system: OCR_SYSTEM,
    maxTokens: 8192,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          part,
          { type: "text", text: "Transcribe this page. Label it as [[Page 1]]." },
        ],
      },
    ],
  });
  return {
    text: cleanExtractedText(result.text),
    truncated: result.finishReason === "length",
  };
}

export async function countPDFPages(buffer: Buffer): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

/** Extract pages [start, end) into a standalone PDF for a vision call. */
export async function slicePDF(buffer: Buffer, start: number, end: number): Promise<Buffer> {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const target = await PDFDocument.create();
  const indices = [];
  for (let i = start; i < Math.min(end, source.getPageCount()); i++) indices.push(i);
  const pages = await target.copyPages(source, indices);
  pages.forEach((p) => target.addPage(p));
  const bytes = await target.save();
  return Buffer.from(bytes);
}

/** OCR one chunk of a scanned PDF; returns text with correct page markers. */
export async function ocrPDFChunk(
  fullPdf: Buffer,
  chunkIndex: number,
  pageCount: number,
): Promise<{ text: string; done: boolean; truncated: boolean }> {
  const start = chunkIndex * OCR_PAGES_PER_CHUNK;
  const end = Math.min(start + OCR_PAGES_PER_CHUNK, pageCount);
  const slice = await slicePDF(fullPdf, start, end);

  const provider = getAIProvider();
  const result = await provider.complete({
    system: OCR_SYSTEM,
    maxTokens: 8192,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "file", mediaType: "application/pdf", data: slice.toString("base64") },
          {
            type: "text",
            text: `Transcribe every page. These are pages ${start + 1} to ${end} of the original document — label them [[Page ${start + 1}]] through [[Page ${end}]] accordingly.`,
          },
        ],
      },
    ],
  });

  return {
    text: cleanExtractedText(result.text),
    done: end >= pageCount,
    truncated: result.finishReason === "length",
  };
}
