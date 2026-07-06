import type { CandidateQuestion } from "./types";
import { sanitizeCandidate } from "./normalize";

/**
 * Fast path for spreadsheets/CSVs that are already structured question banks.
 * Maps flexible header names onto question fields; returns null when the
 * sheet doesn't look like a question table (falls back to LLM extraction).
 */

const HEADER_ALIASES: Record<string, string[]> = {
  number: ["no", "no.", "sno", "s.no", "sl", "#", "number", "qno", "q no", "q.no"],
  stem: ["question", "question text", "stem", "questions", "question_text", "prompt"],
  optionA: ["a", "option a", "optiona", "option_a", "opt a", "choice a", "1"],
  optionB: ["b", "option b", "optionb", "option_b", "opt b", "choice b", "2"],
  optionC: ["c", "option c", "optionc", "option_c", "opt c", "choice c", "3"],
  optionD: ["d", "option d", "optiond", "option_d", "opt d", "choice d", "4"],
  optionE: ["e", "option e", "optione", "option_e", "opt e", "choice e", "5"],
  answer: ["answer", "correct", "correct answer", "key", "ans", "correct_option", "answer key"],
  explanation: ["explanation", "solution", "rationale", "reason", "explaination", "notes"],
  difficulty: ["difficulty", "level", "diff"],
  topic: ["topic", "chapter", "unit", "subject", "category"],
};

function matchHeader(header: string): string | null {
  const clean = header.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(clean)) return field;
  }
  return null;
}

export interface TabularParseResult {
  candidates: CandidateQuestion[];
  topicHints: (string | null)[];
  skippedRows: number;
}

export function parseTabularQuestions(rows: string[][]): TabularParseResult | null {
  if (rows.length < 2) return null;

  const headerRow = rows[0].map((h) => matchHeader(String(h ?? "")));
  const columnMap = new Map<string, number>();
  headerRow.forEach((field, idx) => {
    if (field && !columnMap.has(field)) columnMap.set(field, idx);
  });

  // Must at least have a question column to qualify as a structured bank.
  if (!columnMap.has("stem")) return null;

  const get = (row: string[], field: string): string | null => {
    const idx = columnMap.get(field);
    if (idx === undefined) return null;
    const value = String(row[idx] ?? "").trim();
    return value.length > 0 ? value : null;
  };

  const candidates: CandidateQuestion[] = [];
  const topicHints: (string | null)[] = [];
  let skippedRows = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const stem = get(row, "stem");
    if (!stem || stem.length < 3) {
      skippedRows++;
      continue;
    }

    const options: { key: string; text: string }[] = [];
    for (const key of ["A", "B", "C", "D", "E"]) {
      const text = get(row, `option${key}`);
      if (text) options.push({ key, text });
    }

    const rawAnswer = get(row, "answer");
    let correct: string[] | null = null;
    let answerText: string | null = null;
    if (rawAnswer) {
      const letters = rawAnswer
        .split(/[,/&\s]+/)
        .map((s) => s.replace(/[^a-eA-E0-9]/g, "").toUpperCase())
        .filter((s) => /^[A-E]$/.test(s));
      if (letters.length > 0 && options.length > 0) {
        correct = [...new Set(letters)];
      } else {
        // The "answer" cell held full text, not a letter — keep as answer_text.
        answerText = rawAnswer;
      }
    }

    const number = get(row, "number");
    const candidate: CandidateQuestion = sanitizeCandidate({
      number: number && /^\d+$/.test(number) ? parseInt(number, 10) : null,
      question_type: options.length >= 2 ? (correct && correct.length > 1 ? "mcq_multi" : "mcq_single") : "descriptive",
      stem,
      options: options.length > 0 ? options : null,
      correct_options: correct,
      answer_text: answerText,
      explanation: get(row, "explanation"),
      confidence: {
        stem: 0.98,
        options: options.length > 0 ? 0.98 : undefined,
        answer: correct || answerText ? 0.95 : undefined,
        explanation: get(row, "explanation") ? 0.95 : undefined,
      },
      warnings: [],
    });

    candidates.push(candidate);
    topicHints.push(get(row, "topic"));
  }

  if (candidates.length === 0) return null;
  return { candidates, topicHints, skippedRows };
}
