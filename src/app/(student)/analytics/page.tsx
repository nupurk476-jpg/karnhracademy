import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  Target,
  TrendingDown,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import type { SyllabusUnit, Topic, UserTopicStats } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

type ActivityRow = { day: string; total: number; correct: number };
type TopicStatRow = UserTopicStats & {
  topics: Pick<Topic, "title" | "unit_id"> | null;
};

function formatAvgTime(ms: number | null): string {
  if (ms === null) return "—";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  return `${Math.floor(totalSec / 60)}m ${String(totalSec % 60).padStart(2, "0")}s`;
}

function ActivityChart({ rows }: { rows: ActivityRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {rows.map((r) => (
          <div
            key={r.day}
            className="flex h-full flex-1 items-end"
            title={`${r.day}: ${r.correct}/${r.total} correct`}
          >
            {r.total === 0 ? (
              <div className="h-1 w-full rounded-t bg-muted" />
            ) : (
              <div
                className="relative w-full overflow-hidden rounded-t bg-primary/25"
                style={{ height: `${Math.max(8, Math.round((r.total / max) * 100))}%` }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 bg-primary"
                  style={{ height: `${Math.round((r.correct / r.total) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Correct
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary/25" /> Answered
        </span>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [activityRes, statsRes, unitsRes, timesRes] = await Promise.all([
    supabase.rpc("get_daily_activity", { p_user: profile.id, p_days: 30 }),
    supabase
      .from("user_topic_stats")
      .select("*, topics(title, unit_id)")
      .eq("user_id", profile.id),
    supabase
      .from("syllabus_units")
      .select("*")
      .eq("is_active", true)
      .order("order_index"),
    supabase
      .from("attempts")
      .select("time_taken_ms")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const activity = ((activityRes.data ?? []) as ActivityRow[])
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day));
  const stats = (statsRes.data ?? []) as unknown as TopicStatRow[];
  const units = (unitsRes.data ?? []) as SyllabusUnit[];

  const totalAnswered = stats.reduce((sum, s) => sum + s.attempts, 0);
  const totalCorrect = stats.reduce((sum, s) => sum + s.correct, 0);
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const times = ((timesRes.data ?? []) as { time_taken_ms: number | null }[])
    .map((t) => t.time_taken_ms)
    .filter((t): t is number => t !== null && t > 0);
  const avgTimeMs =
    times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : null;

  const activeDays = activity.filter((r) => r.total > 0).length;

  // Aggregate topic stats up to their syllabus unit.
  const unitMastery = units
    .map((unit) => {
      const unitStats = stats.filter((s) => s.topics?.unit_id === unit.id);
      const attempts = unitStats.reduce((sum, s) => sum + s.attempts, 0);
      const correct = unitStats.reduce((sum, s) => sum + s.correct, 0);
      return { id: unit.id, title: unit.title, attempts, correct };
    })
    .filter((u) => u.attempts > 0)
    .sort((a, b) => b.correct / b.attempts - a.correct / a.attempts);

  const weakTopics = stats
    .filter((s) => s.attempts >= 3 && s.correct / s.attempts < 0.6)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);

  const hasData = totalAnswered > 0;

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in-up space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track how your preparation is trending over time.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total answered"
          value={totalAnswered.toLocaleString("en-US")}
          hint="All time"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Overall accuracy"
          value={overallAccuracy === null ? "—" : `${overallAccuracy}%`}
          hint="All time"
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Avg time / question"
          value={formatAvgTime(avgTimeMs)}
          hint="Recent attempts"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Active days"
          value={activeDays}
          hint="Last 30 days"
          icon={<CalendarDays className="size-4" />}
        />
      </div>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Last 30 days</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Daily answered questions, with the correct share highlighted.
        </p>
        <div className="mt-4">
          {hasData || activeDays > 0 ? (
            <ActivityChart rows={activity} />
          ) : (
            <EmptyState
              className="border-0 p-6"
              icon={<BarChart3 className="size-5" />}
              title="No activity yet"
              description="Your analytics will appear after your first practice session."
              action={
                <Button asChild size="sm">
                  <Link href="/practice">Start practicing</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Mastery by unit</h2>
          </div>
          {unitMastery.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {unitMastery.map((unit) => {
                const pct = Math.round((unit.correct / unit.attempts) * 100);
                return (
                  <li key={unit.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{unit.title}</p>
                      <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {pct}% · {unit.attempts.toLocaleString("en-US")} answered
                      </p>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="mt-4 border-0 p-6"
              icon={<Layers className="size-5" />}
              title="No unit data yet"
              description="Answer questions across the syllabus to see your mastery per unit."
            />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-destructive" />
            <h2 className="text-base font-semibold">Weak topics</h2>
          </div>
          {weakTopics.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {weakTopics.map((s) => {
                const pct = Math.round((s.correct / s.attempts) * 100);
                return (
                  <li
                    key={s.topic_id}
                    className="flex items-center gap-3 rounded-xl border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.topics?.title ?? "Uncategorized"}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        <span className="font-semibold text-destructive">{pct}%</span> ·{" "}
                        {s.attempts} attempts
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0 rounded-lg">
                      <Link href={`/practice?topic=${s.topic_id}&mode=custom`}>Practice</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="mt-4 border-0 p-6"
              icon={<Target className="size-5" />}
              title="No weak topics found"
              description={
                hasData
                  ? "Great work — nothing is below 60% accuracy right now."
                  : "Answer at least a few questions per topic to unlock this insight."
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
