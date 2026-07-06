"use server";

import { z } from "zod";
import { assertUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult, toSafeMessage } from "@/lib/errors";
import type { PracticeSession, Question } from "@/lib/types";

/**
 * Student practice & mock-test sessions. Question selection runs server-side;
 * answers are validated server-side so results can't be spoofed from the client.
 */

const startSchema = z.object({
  kind: z.enum(["practice", "adaptive", "mock", "bookmarks"]),
  unitId: z.string().uuid().nullable().optional(),
  topicId: z.string().uuid().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  count: z.number().int().min(1).max(100).default(10),
  durationMin: z.number().int().min(5).max(180).optional(),
});

export async function startSession(
  input: z.infer<typeof startSchema>,
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const profile = await assertUser();
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid session settings.");
    const { kind, unitId, topicId, difficulty, count, durationMin } = parsed.data;

    const supabase = await createClient();
    let questionIds: string[] = [];

    if (kind === "adaptive") {
      const { data } = await supabase.rpc("pick_adaptive_questions", {
        p_user: profile.id,
        p_count: count,
      });
      questionIds = (data ?? []).map((r: { pick_adaptive_questions: string } | string) =>
        typeof r === "string" ? r : Object.values(r)[0],
      );
    } else if (kind === "bookmarks") {
      const { data } = await supabase
        .from("bookmarks")
        .select("question_id, questions!inner(status)")
        .eq("user_id", profile.id)
        .eq("questions.status", "published")
        .limit(count);
      questionIds = shuffle((data ?? []).map((b) => b.question_id)).slice(0, count);
    } else {
      let query = supabase
        .from("questions")
        .select("id")
        .eq("status", "published")
        .limit(400);
      if (unitId) query = query.eq("unit_id", unitId);
      if (topicId) query = query.eq("topic_id", topicId);
      if (difficulty) query = query.eq("difficulty", difficulty);
      const { data } = await query;
      questionIds = shuffle((data ?? []).map((q) => q.id)).slice(0, count);
    }

    if (questionIds.length === 0) {
      return fail(
        kind === "bookmarks"
          ? "You have no bookmarked questions yet."
          : "No published questions match those filters yet.",
      );
    }

    const isMock = kind === "mock";
    const duration = isMock ? (durationMin ?? Math.max(10, questionIds.length)) * 60 : null;

    const { data: session, error } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: profile.id,
        kind,
        unit_id: unitId ?? null,
        topic_id: topicId ?? null,
        question_ids: questionIds,
        duration_sec: duration,
        ends_at: duration ? new Date(Date.now() + duration * 1000).toISOString() : null,
        config: { difficulty: difficulty ?? null, requested: count },
      })
      .select("id")
      .single();
    if (error || !session) return fail("Could not start the session.");

    return ok({ sessionId: session.id });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

const answerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOptions: z.array(z.string()).max(10).nullable(),
  answerText: z.string().max(2000).nullable(),
  timeTakenMs: z.number().int().nonnegative().max(3_600_000).nullable(),
});

export interface AnswerFeedback {
  isCorrect: boolean | null;
  correctOptions: string[] | null;
  answerText: string | null;
  explanation: string | null;
  explanationIsAI: boolean;
}

/** Record an answer; grading happens here, never in the browser. */
export async function submitAnswer(
  input: z.infer<typeof answerSchema>,
): Promise<ActionResult<AnswerFeedback>> {
  try {
    const profile = await assertUser();
    const parsed = answerSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid answer.");
    const { sessionId, questionId, selectedOptions, answerText, timeTakenMs } = parsed.data;

    const supabase = await createClient();

    const { data: session } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", profile.id)
      .single<PracticeSession>();
    if (!session) return fail("Session not found.");
    if (session.status !== "active") return fail("This session has ended.");
    if (!session.question_ids.includes(questionId)) return fail("Question is not part of this session.");

    // Mock deadline enforcement (small grace for network latency).
    if (session.ends_at && Date.now() > new Date(session.ends_at).getTime() + 15_000) {
      return fail("Time is up for this test.");
    }

    const { data: question } = await supabase
      .from("questions")
      .select("correct_options, answer_text, explanation, explanation_is_ai, question_type")
      .eq("id", questionId)
      .single<Pick<Question, "correct_options" | "answer_text" | "explanation" | "explanation_is_ai" | "question_type">>();
    if (!question) return fail("Question not found.");

    let isCorrect: boolean | null = null;
    if (question.correct_options?.length) {
      const expected = [...question.correct_options].sort().join("|");
      const given = [...(selectedOptions ?? [])].sort().join("|");
      isCorrect = expected === given;
    } else if (question.question_type === "numeric" && question.answer_text && answerText) {
      isCorrect =
        normalizeNumeric(question.answer_text) !== null &&
        normalizeNumeric(question.answer_text) === normalizeNumeric(answerText);
    }
    // Descriptive / unknown-answer questions stay null (not graded).

    const { error: attemptErr } = await supabase.from("attempts").insert({
      user_id: profile.id,
      question_id: questionId,
      session_id: sessionId,
      selected_options: selectedOptions,
      answer_text: answerText,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
      kind: session.kind,
    });
    if (attemptErr) return fail("Could not record the answer.");

    await supabase
      .from("practice_sessions")
      .update({
        total_answered: session.total_answered + 1,
        correct_count: session.correct_count + (isCorrect ? 1 : 0),
        current_index: Math.min(session.current_index + 1, session.question_ids.length),
      })
      .eq("id", sessionId);

    // Mock tests must not leak answers mid-test — feedback comes with results.
    if (session.kind === "mock") {
      return ok({
        isCorrect: null,
        correctOptions: null,
        answerText: null,
        explanation: null,
        explanationIsAI: false,
      });
    }

    return ok({
      isCorrect,
      correctOptions: question.correct_options,
      answerText: question.answer_text,
      explanation: question.explanation,
      explanationIsAI: question.explanation_is_ai,
    });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

export async function completeSession(
  sessionId: string,
): Promise<ActionResult<{ correct: number; total: number }>> {
  try {
    const profile = await assertUser();
    const supabase = await createClient();

    const { data: session } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", profile.id)
      .single<PracticeSession>();
    if (!session) return fail("Session not found.");

    if (session.status === "active") {
      await supabase
        .from("practice_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return ok({ correct: session.correct_count, total: session.question_ids.length });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

export async function toggleBookmark(
  questionId: string,
): Promise<ActionResult<{ bookmarked: boolean }>> {
  try {
    const profile = await assertUser();
    if (!z.string().uuid().safeParse(questionId).success) return fail("Invalid question.");
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", profile.id)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", profile.id)
        .eq("question_id", questionId);
      return ok({ bookmarked: false });
    }

    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: profile.id, question_id: questionId });
    if (error) return fail("Could not bookmark this question.");
    return ok({ bookmarked: true });
  } catch (err) {
    const safe = toSafeMessage(err);
    return fail(safe.message, safe.code);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeNumeric(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
