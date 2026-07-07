import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Sparkles, Timer, XCircle } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/shared/progress-ring";
import { cn } from "@/lib/utils";
import type { Attempt, PracticeSession, Question, Topic } from "@/lib/types";

export const metadata: Metadata = { title: "Test results" };

function AIBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-transparent bg-accent text-accent-foreground">
      <Sparkles className="size-3" />
      AI-generated
    </Badge>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default async function TestResultsPage({
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

  // Results reveal correct answers, so an active test can't peek at them:
  // send it back to the runner unless time has actually expired — in which
  // case finalize it here (covers closed tabs that never auto-submitted).
  if (session.status === "active") {
    const expired = session.ends_at
      ? Date.now() > new Date(session.ends_at).getTime()
      : false;
    if (!expired) redirect(`/tests/session/${session.id}`);
    // Session writes are service-role only (students have SELECT-only RLS).
    await createAdminClient()
      .from("practice_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("user_id", profile.id);
  }

  const [questionsRes, attemptsRes, topicsRes] = await Promise.all([
    supabase.from("questions").select("*").in("id", session.question_ids),
    supabase
      .from("attempts")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", profile.id)
      .order("created_at"),
    supabase.from("topics").select("id, title"),
  ]);

  const byId = new Map(
    ((questionsRes.data ?? []) as Question[]).map((q) => [q.id, q]),
  );
  const ordered = session.question_ids
    .map((qid) => byId.get(qid))
    .filter((q): q is Question => Boolean(q));

  const topicTitles = new Map(
    ((topicsRes.data ?? []) as Pick<Topic, "id" | "title">[]).map((t) => [t.id, t.title]),
  );

  // First attempt per question wins (defensive against duplicates).
  const attemptByQuestion = new Map<string, Attempt>();
  for (const attempt of (attemptsRes.data ?? []) as Attempt[]) {
    if (!attemptByQuestion.has(attempt.question_id)) {
      attemptByQuestion.set(attempt.question_id, attempt);
    }
  }

  const total = ordered.length;
  const attempts = ordered
    .map((q) => attemptByQuestion.get(q.id))
    .filter((a): a is Attempt => Boolean(a));
  const correct = attempts.filter((a) => a.is_correct === true).length;
  const incorrect = attempts.filter((a) => a.is_correct === false).length;
  const unanswered = total - attempts.length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const finishedAtMs = session.completed_at ? new Date(session.completed_at).getTime() : null;
  const startedAtMs = new Date(session.started_at).getTime();
  const endsAtMs = session.ends_at ? new Date(session.ends_at).getTime() : null;
  const timeTaken = finishedAtMs ? finishedAtMs - startedAtMs : null;
  const beatTheClock =
    finishedAtMs !== null && endsAtMs !== null && finishedAtMs < endsAtMs;

  const heroCopy =
    scorePct >= 80
      ? "Outstanding — exam-ready performance."
      : scorePct >= 60
        ? "Solid work. A little more polish and you're there."
        : "Good effort — review the explanations below and try again.";

  // Per-topic breakdown from graded attempts.
  const topicGroups = new Map<string, { title: string; graded: number; correct: number }>();
  for (const question of ordered) {
    const attempt = attemptByQuestion.get(question.id);
    if (!attempt || attempt.is_correct === null) continue;
    const key = question.topic_id ?? "uncategorized";
    const group = topicGroups.get(key) ?? {
      title: question.topic_id
        ? (topicTitles.get(question.topic_id) ?? "Uncategorized")
        : "Uncategorized",
      graded: 0,
      correct: 0,
    };
    group.graded += 1;
    if (attempt.is_correct) group.correct += 1;
    topicGroups.set(key, group);
  }
  const breakdown = [...topicGroups.values()].sort(
    (a, b) => b.correct / b.graded - a.correct / a.graded,
  );

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* Score hero */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <ProgressRing value={total > 0 ? correct / total : 0} size={124} strokeWidth={10}>
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {scorePct}
                <span className="text-lg">%</span>
              </p>
              <p className="text-[11px] text-muted-foreground">score</p>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {correct} / {total} correct
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{heroCopy}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="outline" className="border-transparent bg-success/15 text-success tabular-nums">
                {correct} correct
              </Badge>
              <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive tabular-nums">
                {incorrect} incorrect
              </Badge>
              {unanswered > 0 && (
                <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground tabular-nums">
                  {unanswered} unanswered
                </Badge>
              )}
              {timeTaken !== null && (
                <Badge variant="outline" className="gap-1 text-muted-foreground tabular-nums">
                  <Timer className="size-3" />
                  {formatDuration(timeTaken)}
                  {beatTheClock && " — you beat the clock"}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 flex-1 rounded-xl">
            <Link href="/tests">Take another test</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 flex-1 rounded-xl">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>

      {/* Topic breakdown */}
      {breakdown.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Breakdown by topic</h2>
          <ul className="mt-4 space-y-4">
            {breakdown.map((group) => {
              const pct = Math.round((group.correct / group.graded) * 100);
              return (
                <li key={group.title}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{group.title}</p>
                    <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {group.correct}/{group.graded} · {pct}%
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        pct >= 60 ? "bg-primary" : "bg-destructive",
                      )}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Question review */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Review your answers</h2>
        {ordered.map((question, i) => {
          const attempt = attemptByQuestion.get(question.id);
          const selectedSet = new Set(attempt?.selected_options ?? []);
          const correctSet = new Set(question.correct_options ?? []);
          const isText =
            question.question_type === "numeric" ||
            question.question_type === "descriptive";

          return (
            <article key={question.id} className="rounded-2xl border bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {i + 1}
                </p>
                {!attempt ? (
                  <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                    Not answered
                  </Badge>
                ) : attempt.is_correct === true ? (
                  <Badge variant="outline" className="border-transparent bg-success/15 text-success">
                    Correct
                  </Badge>
                ) : attempt.is_correct === false ? (
                  <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive">
                    Incorrect
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                    Ungraded
                  </Badge>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed md:text-base">
                {question.stem}
              </p>

              {question.options && question.options.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {question.options.map((option) => {
                    const isCorrectOption = correctSet.has(option.key);
                    const isChosen = selectedSet.has(option.key);
                    return (
                      <li
                        key={option.key}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                          isCorrectOption && "border-success bg-success/15 text-success",
                          isChosen && !isCorrectOption &&
                            "border-destructive bg-destructive/10 text-destructive",
                          !isCorrectOption && !isChosen && "text-muted-foreground",
                        )}
                      >
                        <span className="w-5 shrink-0 text-xs font-semibold">{option.key}</span>
                        <span className="flex-1 whitespace-pre-wrap">{option.text}</span>
                        {isChosen && (
                          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide">
                            Your answer
                          </span>
                        )}
                        {isCorrectOption && <CheckCircle2 className="size-4 shrink-0" />}
                        {isChosen && !isCorrectOption && <XCircle className="size-4 shrink-0" />}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isText && (
                <div className="mt-4 space-y-2 text-sm">
                  {attempt?.answer_text && (
                    <p className="rounded-xl border px-3.5 py-2.5">
                      <span className="font-medium">Your answer: </span>
                      <span className="whitespace-pre-wrap">{attempt.answer_text}</span>
                    </p>
                  )}
                  {question.answer_text && (
                    <p className="rounded-xl border border-success bg-success/15 px-3.5 py-2.5 text-success">
                      <span className="font-medium">Correct answer: </span>
                      <span className="whitespace-pre-wrap">{question.answer_text}</span>
                    </p>
                  )}
                </div>
              )}

              {question.explanation && (
                <div className="mt-4 rounded-xl bg-muted/50 p-3.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Explanation
                    </p>
                    {question.explanation_is_ai && <AIBadge />}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
