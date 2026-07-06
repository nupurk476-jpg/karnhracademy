import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Attempt, PracticeSession, Question } from "@/lib/types";
import { MockRunner, type SavedAnswer } from "./mock-runner";

export const metadata: Metadata = { title: "Mock test" };

type AttemptRow = Pick<Attempt, "question_id" | "selected_options" | "answer_text">;

export default async function MockSessionPage({
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
  if (session.kind !== "mock") redirect(`/practice/session/${session.id}`);
  if (session.status === "completed") redirect(`/tests/session/${session.id}/results`);
  if (session.status !== "active") redirect("/tests");

  const [questionsRes, attemptsRes] = await Promise.all([
    supabase.from("questions").select("*").in("id", session.question_ids),
    supabase
      .from("attempts")
      .select("question_id, selected_options, answer_text")
      .eq("session_id", session.id)
      .eq("user_id", profile.id)
      .order("created_at"),
  ]);

  const byId = new Map(
    ((questionsRes.data ?? []) as Question[]).map((q) => [q.id, q]),
  );
  const ordered = session.question_ids
    .map((qid) => byId.get(qid))
    .filter((q): q is Question => Boolean(q));

  if (ordered.length === 0) redirect("/tests");

  // Restore already-saved answers so a refresh doesn't lose exam state.
  const initialAnswers: Record<string, SavedAnswer> = {};
  for (const attempt of (attemptsRes.data ?? []) as AttemptRow[]) {
    if (!initialAnswers[attempt.question_id]) {
      initialAnswers[attempt.question_id] = {
        options: attempt.selected_options,
        text: attempt.answer_text,
      };
    }
  }

  return (
    <MockRunner session={session} questions={ordered} initialAnswers={initialAnswers} />
  );
}
