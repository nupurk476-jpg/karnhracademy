import type { AnswerKeyEntry } from "./types";

/**
 * Heuristic document-structure detection. These run BEFORE the LLM pass:
 * they find question boundaries (so chunking never splits a question in
 * half) and parse compact answer-key sections deterministically.
 */

// "1." / "Q1)" / "Question 12:" / "12 -" at line start
const QUESTION_START =
  /^\s*(?:q(?:uestion)?\s*\.?\s*)?(\d{1,4})\s*[).:\-–]\s+/i;

// A line that looks like an answer-key heading
const KEY_HEADING =
  /^\s*(answer\s*key|answers?|key|solutions?)\s*[:.\-]?\s*$/i;

// Compact key formats: "1. B", "1-B", "1) b", "Q1: B", "1 B" and grids "1.B 2.C 3.A"
const KEY_PAIR = /(?:^|\s)(?:q\s*)?(\d{1,4})\s*[).:\-–]?\s*([a-eA-E])(?=[\s,;.)]|$)/g;

export function isQuestionStart(line: string): number | null {
  const m = line.match(QUESTION_START);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Split raw text into chunks of roughly `targetSize` chars, cutting only at
 * question boundaries (or paragraph breaks when no boundaries are found).
 */
export function chunkByQuestions(text: string, targetSize = 9000): string[] {
  if (text.length <= targetSize) return [text];

  const lines = text.split("\n");
  const boundaries: number[] = []; // char offsets where a question starts
  let offset = 0;
  for (const line of lines) {
    if (isQuestionStart(line) !== null) boundaries.push(offset);
    offset += line.length + 1;
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + targetSize, text.length);
    if (end < text.length) {
      // last question boundary inside the window, but keep chunks non-trivial
      const candidates = boundaries.filter((b) => b > start + targetSize * 0.3 && b < end);
      if (candidates.length > 0) {
        end = candidates[candidates.length - 1];
      } else {
        const paragraph = text.lastIndexOf("\n\n", end);
        if (paragraph > start + targetSize * 0.3) end = paragraph;
      }
    }
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * Detect and parse a compact answer-key section ("Answer Key: 1.B 2.C …").
 * Returns entries plus the char range of the section so it can be handled
 * separately from question text. Only trusts sections where pairs are dense —
 * a lone "1. B" inside prose is not a key.
 */
export function detectAnswerKeySection(
  text: string,
): { entries: AnswerKeyEntry[]; start: number; end: number } | null {
  const lines = text.split("\n");
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    if (KEY_HEADING.test(lines[i])) {
      // Take everything from the heading until text stops looking like key pairs.
      const sectionStart = offset;
      let sectionEnd = offset + lines[i].length + 1;
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j];
        const pairs = countKeyPairs(line);
        const meaningful = line.trim().length > 0;
        if (meaningful && pairs === 0 && body.length > 0) break;
        if (meaningful && pairs === 0 && line.trim().length > 40) break;
        body.push(line);
        sectionEnd += line.length + 1;
      }
      const entries = parseKeyPairs(body.join("\n"));
      if (entries.length >= 3) {
        return { entries, start: sectionStart, end: Math.min(sectionEnd, text.length) };
      }
    }
    offset += lines[i].length + 1;
  }

  return null;
}

function countKeyPairs(line: string): number {
  let count = 0;
  KEY_PAIR.lastIndex = 0;
  while (KEY_PAIR.exec(line) !== null) count++;
  return count;
}

export function parseKeyPairs(text: string): AnswerKeyEntry[] {
  const entries = new Map<number, AnswerKeyEntry>();
  KEY_PAIR.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEY_PAIR.exec(text)) !== null) {
    const number = parseInt(m[1], 10);
    if (!entries.has(number)) {
      entries.set(number, {
        number,
        correct_options: [m[2].toUpperCase()],
        answer_text: null,
      });
    }
  }
  return [...entries.values()].sort((a, b) => a.number - b.number);
}

/**
 * Quick shape assessment used to pick the extraction strategy and to detect
 * scanned documents (almost no text per page).
 */
export function assessText(text: string, pageCount: number | null) {
  const trimmed = text.replace(/\[\[Page \d+\]\]/g, "").trim();
  const perPage = pageCount ? trimmed.length / Math.max(pageCount, 1) : trimmed.length;
  const questionStarts = trimmed
    .split("\n")
    .filter((l) => isQuestionStart(l) !== null).length;

  return {
    totalChars: trimmed.length,
    charsPerPage: Math.round(perPage),
    questionStarts,
    looksScanned: pageCount !== null ? perPage < 120 : trimmed.length < 40,
  };
}

/** Locate a candidate stem inside the raw text to derive page provenance. */
export function findSourcePage(rawText: string, stem: string): number | null {
  const needle = stem.slice(0, 60).trim();
  if (needle.length < 12) return null;
  const idx = rawText.indexOf(needle);
  if (idx === -1) return null;
  const before = rawText.slice(0, idx);
  const markers = before.match(/\[\[Page (\d+)\]\]/g);
  if (!markers || markers.length === 0) return null;
  const last = markers[markers.length - 1].match(/\d+/);
  return last ? parseInt(last[0], 10) : null;
}
