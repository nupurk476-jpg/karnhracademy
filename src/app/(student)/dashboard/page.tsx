import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Flame,
  Library,
  Sparkles,
  Target,
  TrendingDown,
  Timer,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import type { Topic, UserTopicStats } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

type ActivityRow = { day: string; total: number; correct: number };
type TopicStatRow = UserTopicStats & {
  topics: Pick<Topic, "title" | "unit_id"> | null;
};

/** Consecutive days with activity ending today (or yesterday if today is 0). */
function computeStreak(rows: ActivityRow[]): number {
  let i = rows.length - 1;
  if (i >= 0 && rows[i].total === 0) i -= 1; // today untouched — streak survives until midnight
  let streak = 0;
  while (i >= 0 && rows[i].total > 0) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

function motivationFor(streak: number, answered: number): string {
  if (answered === 0) return "Ready for your first practice session? Let's get started.";
  if (streak >= 7) return `A ${streak}-day streak — you're unstoppable. Keep the flame alive!`;
  if (streak >= 2) return `You're on a ${streak}-day streak. One session today keeps it going.`;
  return "Every question you solve today is a point earned on exam day.";
}

function ActivityChart({ rows }: { rows: ActivityRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div>
      <div className="flex h-24 items-end gap-1.5">
        {rows.map((r) => (
          <div
            key={r.day}
            className="flex h-full flex-1 items-end"
            title={`${r.day}: ${r.correct}/${r.total} correct`}
          >
            {r.total === 0 ? (
              <div className="h-1.5 w-full rounded-t bg-muted" />
            ) : (
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.max(10, Math.round((r.total / max) * 100))}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {rows.map((r) => {
          const weekday = "SMTWTFS"[new Date(`${r.day}T00:00:00Z`).getUTCDay()];
          return (
            <span
              key={r.day}
              className="flex-1 text-center text-[10px] font-medium text-muted-foreground"
            >
              {weekday}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [activityRes, questionsRes, statsRes] = await Promise.all([
    supabase.rpc("get_daily_activity", { p_user: profile.id, p_days: 30 }),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("user_topic_stats")
      .select("*, topics(title, unit_id)")
      .eq("user_id", profile.id),
  ]);

  const activity = ((activityRes.data ?? []) as ActivityRow[])
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day));
  const stats = (statsRes.data ?? []) as unknown as TopicStatRow[];

  const totalAnswered = activity.reduce((sum, r) => sum + r.total, 0);
  const totalCorrect = activity.reduce((sum, r) => sum + r.correct, 0);
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const streak = computeStreak(activity);
  const publishedCount = questionsRes.count ?? 0;

  const weakTopics = stats
    .filter((s) => s.attempts >= 3 && s.correct / s.attempts < 0.6)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
    .slice(0, 4);

  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Hi, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {motivationFor(streak, totalAnswered)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Day streak"
          value={streak}
          hint={streak > 0 ? "Keep it going" : "Practice today to start one"}
          icon={<Flame className="size-4" />}
        />
        <StatCard
          label="Questions solved"
          value={totalAnswered.toLocaleString("en-US")}
          hint="Last 30 days"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Accuracy"
          value={accuracy === null ? "—" : `${accuracy}%`}
          hint="Last 30 days"
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Question bank"
          value={publishedCount.toLocaleString("en-US")}
          hint="Available questions"
          icon={<Library className="size-4" />}
        />
      </div>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Continue learning</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pick up where you left off — adaptive practice targets what you need most.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="h-14 rounded-xl text-base">
            <Link href="/practice?mode=adaptive">
              <Sparkles className="!size-5" />
              Start adaptive practice
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 rounded-xl text-base">
            <Link href="/tests">
              <Timer className="!size-5" />
              Take a mock test
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-destructive" />
            <h2 className="text-base font-semibold">Weak topics</h2>
          </div>
          {weakTopics.length > 0 ? (
            <>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Under 60% accuracy — a focused session can turn these around.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {weakTopics.map((s) => (
                  <Link
                    key={s.topic_id}
                    href={`/practice?topic=${s.topic_id}&mode=custom`}
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-accent"
                  >
                    {s.topics?.title ?? "Uncategorized"}
                    <span className="tabular-nums text-xs font-semibold text-destructive">
                      {Math.round((s.correct / s.attempts) * 100)}%
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              className="mt-4 border-0 p-6"
              icon={<Target className="size-5" />}
              title="No weak topics yet"
              description="Answer more questions to unlock insights about where to focus."
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Last 14 days</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Questions answered per day.
          </p>
          <div className="mt-4">
            <ActivityChart rows={activity.slice(-14)} />
          </div>
        </section>
      </div>
    </div>
  );
}
