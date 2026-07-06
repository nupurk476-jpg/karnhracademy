import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

  const [questionsRes, bookmarksRes] = await Promise.all([
    supabase.from("questions").select("*").in("id", session.question_ids),
    supabase
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", profile.id)
      .in("question_id", session.question_ids),
  ]);

  const byId = new Map(
    ((questionsRes.data ?? []) as Question[]).map((q) => [q.id, q]),
  );
  const ordered = session.question_ids
    .map((qid) => byId.get(qid))
    .filter((q): q is Question => Boolean(q));

  if (ordered.length === 0) redirect("/practice");

  const bookmarkedIds = ((bookmarksRes.data ?? []) as { question_id: string }[]).map(
    (b) => b.question_id,
  );

  return (
    <PracticeRunner session={session} questions={ordered} bookmarkedIds={bookmarkedIds} />
  );
}
