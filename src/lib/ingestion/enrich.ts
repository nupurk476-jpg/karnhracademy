import "server-only";
import { z } from "zod";
import { getAIProvider, getEmbeddings } from "@/lib/ai";
import { completeJSON } from "@/lib/ai/json";
import type { QuestionOption } from "@/lib/types";

/**
 * Enrichment: syllabus classification, difficulty, keywords and draft
 * explanations. All outputs are AI-labelled and confidence-scored — faculty
 * review is always the gate before anything reaches students.
 */

export interface SyllabusEntry {
  topicId: string;
  unitId: string;
  label: string; // "U1 Networking Fundamentals :: OSI Model"
}

export interface EnrichableQuestion {
  id: string;
  stem: string;
  options: QuestionOption[] | null;
  correct_options: string[] | null;
  answer_text: string | null;
  explanation: string | null;
}

const classificationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      topic_index: z.number().int().nullable(),
      difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
      keywords: z.array(z.string()).max(8),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type ClassificationResult = z.infer<typeof classificationSchema>["results"][number];

export async function classifyQuestions(
  questions: EnrichableQuestion[],
  syllabus: SyllabusEntry[],
): Promise<Map<string, ClassificationResult>> {
  if (questions.length === 0 || syllabus.length === 0) return new Map();

  const provider = getAIProvider();

  const topicList = syllabus.map((s, i) => `${i}. ${s.label}`).join("\n");
  const questionList = questions
    .map(
      (q) =>
        `ID ${q.id}\n${q.stem}\n${(q.options ?? []).map((o) => `${o.key}. ${o.text}`).join("\n")}`,
    )
    .join("\n---\n");

  const result = await completeJSON(
    provider,
    {
      system: `You classify exam questions against a syllabus and estimate difficulty.
Rules:
- topic_index: the index of the best-matching topic from the provided list, or null if none fits.
- difficulty: easy (recall), medium (understanding/application), hard (analysis/multi-step), or null if unclear.
- keywords: 3-8 short lowercase technical keywords from the question itself.
- confidence: how sure you are about the topic classification (0-1).
Return JSON only.`,
      maxTokens: 8192,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Syllabus topics:\n${topicList}\n\nQuestions:\n${questionList}`,
            },
          ],
        },
      ],
      jsonSchema: {
        name: "classification",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["results"],
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "topic_index", "difficulty", "keywords", "confidence"],
                properties: {
                  id: { type: "string" },
                  topic_index: { type: ["integer", "null"] },
                  difficulty: { type: ["string", "null"], enum: ["easy", "medium", "hard", null] },
                  keywords: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    classificationSchema,
  );

  const map = new Map<string, ClassificationResult>();
  for (const r of result.results) {
    map.set(r.id, { ...r, keywords: r.keywords.slice(0, 8).map((k) => k.toLowerCase().trim()) });
  }
  return map;
}

const explanationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      explanation: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

/**
 * Draft explanations for questions that have a KNOWN answer but no
 * explanation. Marked explanation_is_ai=true so reviewers see them as drafts.
 * Questions without a known answer are skipped — we never guess answers.
 */
export async function draftExplanations(
  questions: EnrichableQuestion[],
): Promise<Map<string, { explanation: string; confidence: number }>> {
  const eligible = questions.filter(
    (q) => !q.explanation && (q.correct_options?.length || q.answer_text),
  );
  if (eligible.length === 0) return new Map();

  const provider = getAIProvider();

  const questionList = eligible
    .map((q) => {
      const opts = (q.options ?? []).map((o) => `${o.key}. ${o.text}`).join("\n");
      const answer = q.correct_options?.length
        ? `Correct answer: ${q.correct_options.join(", ")}`
        : `Correct answer: ${q.answer_text}`;
      return `ID ${q.id}\n${q.stem}\n${opts}\n${answer}`;
    })
    .join("\n---\n");

  const result = await completeJSON(
    provider,
    {
      system: `You write concise explanations for exam questions whose correct answer is GIVEN.
Rules:
- Explain in 2-4 sentences why the given answer is correct; for MCQs briefly note why the key distractor(s) are wrong.
- Never contradict or change the given answer. If the given answer appears wrong or the question is ambiguous, return explanation: null with low confidence instead of arguing.
- Write for exam candidates: clear, direct, no filler.
- confidence: your certainty the explanation is accurate.
Return JSON only.`,
      maxTokens: 8192,
      temperature: 0.3,
      messages: [{ role: "user", content: [{ type: "text", text: questionList }] }],
      jsonSchema: {
        name: "explanations",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["results"],
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "explanation", "confidence"],
                properties: {
                  id: { type: "string" },
                  explanation: { type: ["string", "null"] },
                  confidence: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    explanationSchema,
  );

  const map = new Map<string, { explanation: string; confidence: number }>();
  for (const r of result.results) {
    if (r.explanation && r.explanation.trim().length > 0) {
      map.set(r.id, { explanation: r.explanation.trim(), confidence: r.confidence });
    }
  }
  return map;
}

/** Embedding text: stem + options, capped for token safety. */
export function embeddingText(stem: string, options: QuestionOption[] | null): string {
  const opts = (options ?? []).map((o) => o.text).join(" | ");
  return `${stem}\n${opts}`.slice(0, 6000);
}

export async function embedQuestions(
  items: { id: string; text: string }[],
): Promise<Map<string, number[]>> {
  const embedder = getEmbeddings();
  const map = new Map<string, number[]>();
  if (!embedder || items.length === 0) return map;

  const BATCH = 48;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const vectors = await embedder.embed(batch.map((b) => b.text));
    batch.forEach((b, idx) => {
      if (vectors[idx]) map.set(b.id, vectors[idx]);
    });
  }
  return map;
}
