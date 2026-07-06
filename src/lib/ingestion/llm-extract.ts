import "server-only";
import { getAIProvider } from "@/lib/ai";
import { completeJSON } from "@/lib/ai/json";
import { extractionResultSchema, type ExtractionResult } from "./types";

/**
 * LLM structured extraction of questions from one chunk of messy text.
 * The prompt encodes the system's core covenant: NEVER invent missing data.
 */

const EXTRACTION_SYSTEM = `You are an expert exam-content extraction engine.
You receive raw text extracted (or OCR'd) from messy study documents: question papers, question banks, answer keys, mixed notes. Formatting is inconsistent and may contain OCR errors.

Your job is to extract every question EXACTLY as it appears, with strict rules:

1. NEVER invent, infer, or complete missing data.
   - If a question has no visible correct answer, correct_options and answer_text MUST be null.
   - If there is no explanation in the text, explanation MUST be null.
   - If options are missing, options MUST be null.
   - Do NOT solve questions yourself. Only record answers explicitly present in the document.
2. Fix ONLY obvious OCR character noise inside otherwise-clear words (e.g. "netw0rk" → "network"). If unsure, keep the original and lower your confidence.
3. Option labels: normalize to single letters "A","B","C","D","E" preserving order.
4. Answers may appear inline ("Ans: b"), bolded markers, ticks, or in a key section like "Answer Key: 1.B 2.C" — capture key sections into answer_key entries (matched by question number), NOT by copying them into unrelated questions.
5. question_type: "mcq_single" (one correct), "mcq_multi" (multiple correct), "true_false", "numeric" (numeric answer), "descriptive" (open-ended / no options).
6. Set per-field confidence between 0 and 1: how certain you are that the field was transcribed correctly from the source (NOT how confident you are in the answer being right).
7. Record data-quality issues per question in warnings (e.g. "options C and D appear merged", "stem may be truncated at page break").
8. Ignore page markers like [[Page 3]], headers, footers, watermarks and page numbers.
9. document_kind: "questions" (mostly questions), "answer_key" (only a key), "mixed", or "other" (no exam content).
10. The text may start or end mid-question; skip fragments that are not clearly a complete question stem, and note nothing for them.

Return JSON only.`;

const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["document_kind", "questions", "answer_key"],
  properties: {
    document_kind: { type: "string", enum: ["questions", "answer_key", "mixed", "other"] },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "number",
          "question_type",
          "stem",
          "options",
          "correct_options",
          "answer_text",
          "explanation",
          "confidence",
          "warnings",
        ],
        properties: {
          number: { type: ["integer", "null"] },
          question_type: {
            type: "string",
            enum: ["mcq_single", "mcq_multi", "true_false", "numeric", "descriptive"],
          },
          stem: { type: "string" },
          options: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "text"],
              properties: { key: { type: "string" }, text: { type: "string" } },
            },
          },
          correct_options: { type: ["array", "null"], items: { type: "string" } },
          answer_text: { type: ["string", "null"] },
          explanation: { type: ["string", "null"] },
          confidence: {
            type: "object",
            additionalProperties: false,
            properties: {
              stem: { type: "number" },
              options: { type: "number" },
              answer: { type: "number" },
              explanation: { type: "number" },
            },
          },
          warnings: { type: "array", items: { type: "string" } },
        },
      },
    },
    answer_key: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "correct_options", "answer_text"],
        properties: {
          number: { type: "integer" },
          correct_options: { type: ["array", "null"], items: { type: "string" } },
          answer_text: { type: ["string", "null"] },
          explanation: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

export async function extractQuestionsFromChunk(
  chunkText: string,
  context: { fileName: string; chunkIndex: number; totalChunks: number; wasOCR: boolean },
): Promise<ExtractionResult> {
  const provider = getAIProvider();

  const prompt = `Source file: "${context.fileName}" (chunk ${context.chunkIndex + 1} of ${context.totalChunks}${context.wasOCR ? ", transcribed via OCR — expect character noise" : ""}).

Extract all questions and any answer-key entries from the text below.

<document_text>
${chunkText}
</document_text>`;

  return completeJSON(
    provider,
    {
      system: EXTRACTION_SYSTEM,
      maxTokens: 16384,
      temperature: 0,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      jsonSchema: { name: "extraction_result", schema: EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown> },
    },
    extractionResultSchema,
  );
}
