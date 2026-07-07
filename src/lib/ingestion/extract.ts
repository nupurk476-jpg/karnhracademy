import "server-only";
import { cleanExtractedText } from "./normalize";
import { assessText } from "./heuristics";
import { parseCSV, sniffDelimiter } from "./csv";
import type { ExtractedText } from "./types";

/**
 * File-type routing for text extraction. Every extractor returns plain text
 * with "[[Page N]]" markers where page provenance is known. Scanned PDFs and
 * images set needsOCR — the pipeline then runs vision OCR via the AI layer.
 */

const IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

// Note: legacy binary formats (.doc, .xls) are intentionally NOT supported —
// the parsers we ship (mammoth, exceljs) only read the modern XML formats.
// Rejecting them at upload beats failing mid-pipeline with a parser error.
export const SUPPORTED_EXTENSIONS = [
  "pdf",
  "docx",
  "csv",
  "xlsx",
  "txt",
  "md",
  "png",
  "jpg",
  "jpeg",
  "webp",
] as const;

export function isSupportedFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

export async function extractFromFile(
  buffer: Buffer,
  fileExt: string,
): Promise<ExtractedText> {
  const ext = fileExt.toLowerCase().replace(/^\./, "");

  if (IMAGE_TYPES.has(ext)) {
    return { text: "", pageCount: 1, needsOCR: true, meta: { reason: "image file" } };
  }

  switch (ext) {
    case "pdf":
      return extractPDF(buffer);
    case "docx":
      return extractDOCX(buffer);
    case "csv":
      return extractCSVText(buffer);
    case "xlsx":
      return extractXLSX(buffer);
    case "txt":
    case "md":
      return {
        text: cleanExtractedText(buffer.toString("utf-8")),
        pageCount: null,
        needsOCR: false,
        meta: {},
      };
    default:
      throw new Error(`Unsupported file type ".${ext}"`);
  }
}

async function extractPDF(buffer: Buffer): Promise<ExtractedText> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const pages = Array.isArray(text) ? text : [String(text)];
  const withMarkers = pages
    .map((pageText, i) => `[[Page ${i + 1}]]\n${cleanExtractedText(pageText ?? "")}`)
    .join("\n\n");

  const shape = assessText(withMarkers, totalPages);

  return {
    text: shape.looksScanned ? "" : withMarkers,
    pageCount: totalPages,
    needsOCR: shape.looksScanned,
    meta: { charsPerPage: shape.charsPerPage, questionStarts: shape.questionStarts },
  };
}

async function extractDOCX(buffer: Buffer): Promise<ExtractedText> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: cleanExtractedText(result.value),
    pageCount: null,
    needsOCR: false,
    meta: { warnings: result.messages.map((m) => m.message).slice(0, 10) },
  };
}

function extractCSVText(buffer: Buffer): ExtractedText {
  const raw = buffer.toString("utf-8");
  const rows = parseCSV(raw, sniffDelimiter(raw));
  return {
    text: rowsToText(rows),
    pageCount: null,
    needsOCR: false,
    meta: { rows: rows.length, tabular: true },
  };
}

async function extractXLSX(buffer: Buffer): Promise<ExtractedText> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const allRows: string[][] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        values.push(cellToString(cell.value));
      });
      allRows.push(values);
    });
  });

  return {
    text: rowsToText(allRows),
    pageCount: null,
    needsOCR: false,
    meta: { rows: allRows.length, tabular: true },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cellToString(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((r: { text: string }) => r.text).join("");
    }
    if ("text" in value) return String(value.text);
    if ("result" in value) return String(value.result ?? "");
    if (value instanceof Date) return value.toISOString();
  }
  return String(value);
}

/** Serialize tabular rows for storage / LLM fallback while staying parseable. */
export function rowsToText(rows: string[][]): string {
  return rows
    .map((r) => r.map((c) => String(c ?? "").replace(/\t/g, " ")).join("\t"))
    .join("\n");
}

/** Recover rows from the serialized form above. */
export function textToRows(text: string): string[][] {
  return text
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => l.split("\t"));
}
