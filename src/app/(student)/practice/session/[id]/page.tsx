import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PracticeSession, Question } from "@/lib/types";
import { PracticeRunner } from "./practice-runner";

export const metadata: Metadata = { title: "Practice session" };

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle<PracticeSession>();

  if (!session) notFound();
  if (session.kind === "mock") redirect(`/tests/session/${session.id}`);
  if (session.status !== "active") redirect("/practice");

  const [questionsRes, bookmarksRes, attemptsRes] = await Promise.all([
    supabase.from("questions").select("*").in("id", session.question_ids),
    supabase
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", profile.id)
      .in("question_id", session.question_ids),
    supabase
      .from("attempts")
      .select("question_id")
      .eq("session_id", session.id)
      .eq("user_id", profile.id),
  ]);

  const answeredIds = new Set(
    ((attemptsRes.data ?? []) as { question_id: string }[]).map((a) => a.question_id),
  );

  const byId = new Map(
    ((questionsRes.data ?? []) as Question[]).map((q) => [q.id, q]),
  );
  const ordered = session.question_ids
    .map((qid) => byId.get(qid))
    .filter((q): q is Question => Boolean(q))
    // Answers and explanations come back from submitAnswer after each attempt;
    // don't ship them ahead of time in the page payload.
    .map((q) => ({
      ...q,
      correct_options: null,
      answer_text: null,
      explanation: null,
      explanation_is_ai: false,
    }));

  if (ordered.length === 0) redirect("/practice");

  // Resume support: a refresh continues from the first unanswered question
  // instead of restarting (submitAnswer is also idempotent server-side).
  const remaining = ordered.filter((q) => !answeredIds.has(q.id));
  if (remaining.length === 0) {
    // Session writes are service-role only (students have SELECT-only RLS).
    await createAdminClient()
      .from("practice_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("user_id", profile.id);
    redirect("/practice");
  }

  const bookmarkedIds = ((bookmarksRes.data ?? []) as { question_id: string }[]).map(
    (b) => b.question_id,
  );

  return (
    <PracticeRunner
      session={session}
      questions={remaining}
      bookmarkedIds={bookmarkedIds}
      initialAnswered={answeredIds.size}
    />
  );
}
