import { z } from "zod";

/**
 * Shared shapes for the ingestion pipeline. A "candidate" is a question as
 * extracted from a messy source document — fields may be missing, and the
 * pipeline must NEVER invent them. Missing stays null; confidence says how
 * sure the extractor was about what it did find.
 */

export const optionSchema = z.object({
  key: z.string().min(1).max(4),
  text: z.string(),
});

export const candidateConfidenceSchema = z.object({
  stem: z.number().min(0).max(1).optional(),
  options: z.number().min(0).max(1).optional(),
  answer: z.number().min(0).max(1).optional(),
  explanation: z.number().min(0).max(1).optional(),
});

export const candidateQuestionSchema = z.object({
  number: z.number().int().nullable(),
  question_type: z
    .enum(["mcq_single", "mcq_multi", "true_false", "numeric", "descriptive"])
    .default("mcq_single"),
  stem: z.string().min(3),
  options: z.array(optionSchema).nullable(),
  correct_options: z.array(z.string()).nullable(),
  answer_text: z.string().nullable(),
  explanation: z.string().nullable(),
  confidence: candidateConfidenceSchema.default({}),
  warnings: z.array(z.string()).default([]),
});

export type CandidateQuestion = z.infer<typeof candidateQuestionSchema>;

export const answerKeyEntrySchema = z.object({
  number: z.number().int(),
  correct_options: z.array(z.string()).nullable(),
  answer_text: z.string().nullable(),
  explanation: z.string().nullable().optional(),
});

export type AnswerKeyEntry = z.infer<typeof answerKeyEntrySchema>;

export const extractionResultSchema = z.object({
  document_kind: z.enum(["questions", "answer_key", "mixed", "other"]),
  questions: z.array(candidateQuestionSchema),
  answer_key: z.array(answerKeyEntrySchema).nullable(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export interface ExtractedText {
  /** Full text with "[[Page N]]" markers when page info is known. */
  text: string;
  pageCount: number | null;
  /** True when the file has no extractable text layer (needs vision OCR). */
  needsOCR: boolean;
  meta: Record<string, unknown>;
}

/** Cursor state persisted in ingestion_jobs.config between process ticks. */
export interface JobCursor {
  parseChunk?: number;
  retries?: number;
  ocrChunk?: number;
  answerKey?: AnswerKeyEntry[];
  defaultUnitId?: string;
}
