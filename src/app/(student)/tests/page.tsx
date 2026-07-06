import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PracticeSession, SyllabusUnit } from "@/lib/types";
import { MockSetup, type RecentTest } from "./mock-setup";

export const metadata: Metadata = { title: "Mock tests" };

type RecentRow = Pick<
  PracticeSession,
  "id" | "status" | "correct_count" | "question_ids" | "started_at" | "completed_at"
>;

function formatStarted(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function TestsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [unitsRes, recentRes] = await Promise.all([
    supabase
      .from("syllabus_units")
      .select("*")
      .eq("is_active", true)
      .order("order_index"),
    supabase
      .from("practice_sessions")
      .select("id, status, correct_count, question_ids, started_at, completed_at")
      .eq("user_id", profile.id)
      .eq("kind", "mock")
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const units = (unitsRes.data ?? []) as SyllabusUnit[];
  const recent: RecentTest[] = ((recentRes.data ?? []) as RecentRow[]).map((s) => ({
    id: s.id,
    status: s.status,
    correctCount: s.correct_count,
    totalQuestions: s.question_ids.length,
    startedLabel: formatStarted(s.started_at),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mock tests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Timed, exam-style tests. Results and explanations unlock when you finish.
        </p>
      </header>
      <MockSetup units={units} recent={recent} />
    </div>
  );
}
