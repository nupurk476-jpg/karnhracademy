import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai";
import { toSafeMessage } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import type { Question } from "@/lib/types";

const log = createLogger("api.ai.explain");

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const bodySchema = z.object({ questionId: z.string().uuid() });

// Best-effort per-user rate limit on paid AI generation. In-memory, so it is
// per-instance on serverless — move to a durable store (e.g. Upstash) if
// abuse becomes a concern; cache hits below are not limited.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const recentCalls = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const calls = (recentCalls.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (calls.length >= RATE_LIMIT) return true;
  calls.push(now);
  recentCalls.set(userId, calls);
  if (recentCalls.size > 5000) recentCalls.clear(); // bound memory
  return false;
}

/**
 * On-demand AI explanation for a published question. Results are cached in
 * ai_explanation_cache — the reviewed question row is never mutated.
 */
export async function POST(request: Request) {
  try {
    const profile = await assertUser();
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { questionId } = body.data;

    const db = createAdminClient();

    const { data: question } = await db
      .from("questions")
      .select("id, status, stem, options, correct_options, answer_text, explanation, explanation_is_ai")
      .eq("id", questionId)
      .single<Pick<Question, "id" | "status" | "stem" | "options" | "correct_options" | "answer_text" | "explanation" | "explanation_is_ai">>();

    if (!question || question.status !== "published") {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.explanation) {
      return NextResponse.json({
        explanation: question.explanation,
        isAI: question.explanation_is_ai,
        cached: true,
      });
    }

    const { data: cached } = await db
      .from("ai_explanation_cache")
      .select("explanation")
      .eq("question_id", questionId)
      .maybeSingle();
    if (cached) {
      return NextResponse.json({ explanation: cached.explanation, isAI: true, cached: true });
    }

    if (isRateLimited(profile.id)) {
      return NextResponse.json(
        { error: "Slow down a little — try again in a minute." },
        { status: 429 },
      );
    }

    const provider = getAIProvider();
    const opts = (question.options ?? []).map((o) => `${o.key}. ${o.text}`).join("\n");
    const answer = question.correct_options?.length
      ? `The correct answer is: ${question.correct_options.join(", ")}`
      : question.answer_text
        ? `The correct answer is: ${question.answer_text}`
        : "The correct answer is not recorded — explain how to approach the question without asserting a specific answer.";

    const result = await provider.complete({
      system:
        "You are a friendly, expert exam tutor. Explain clearly in 2-4 short sentences why the given answer is correct (and, for MCQs, why the tempting wrong option fails). Never change or second-guess the given answer. No preamble.",
      maxTokens: 1024,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `${question.stem}\n${opts}\n\n${answer}` }],
        },
      ],
    });

    const explanation = result.text.trim();
    if (!explanation) {
      return NextResponse.json({ error: "AI explanation unavailable" }, { status: 503 });
    }

    await db
      .from("ai_explanation_cache")
      .upsert({ question_id: questionId, explanation, model: provider.defaultModel });

    log.info("explanation generated", { questionId, user: profile.id });
    return NextResponse.json({ explanation, isAI: true, cached: false });
  } catch (err) {
    const safe = toSafeMessage(err);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
