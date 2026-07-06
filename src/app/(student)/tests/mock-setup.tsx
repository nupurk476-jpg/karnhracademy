"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, History, Timer } from "lucide-react";
import { startSession } from "@/lib/actions/practice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { SessionStatus, SyllabusUnit } from "@/lib/types";

export interface RecentTest {
  id: string;
  status: SessionStatus;
  correctCount: number;
  totalQuestions: number;
  startedLabel: string;
}

const COUNTS = [10, 25, 50] as const;
const DURATIONS = [15, 30, 60] as const;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl border px-4 text-sm font-medium tabular-nums transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function statusInfo(test: RecentTest): { label: string; className: string } {
  if (test.status === "active") {
    return { label: "In progress", className: "bg-warning/15 text-warning-foreground dark:text-warning" };
  }
  if (test.status === "completed") {
    return { label: "Completed", className: "bg-success/15 text-success" };
  }
  return { label: "Abandoned", className: "bg-muted text-muted-foreground" };
}

export function MockSetup({
  units,
  recent,
}: {
  units: SyllabusUnit[];
  recent: RecentTest[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState<number>(25);
  const [duration, setDuration] = useState<number>(30);
  const [unitId, setUnitId] = useState<string>("all");

  function onStart() {
    startTransition(async () => {
      const result = await startSession({
        kind: "mock",
        count,
        durationMin: duration,
        unitId: unitId === "all" ? null : unitId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/tests/session/${result.data.sessionId}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="space-y-1.5">
          <Label>Questions</Label>
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <Chip key={c} selected={count === c} onClick={() => setCount(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Duration</Label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Chip key={d} selected={duration === d} onClick={() => setDuration(d)}>
                {d} min
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mock-unit">Unit (optional)</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger id="mock-unit">
              <SelectValue placeholder="All units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="lg"
          className="h-12 w-full rounded-xl text-base"
          onClick={onStart}
          disabled={pending}
        >
          {pending ? <Spinner className="size-5" /> : <Timer className="!size-5" />}
          {pending ? "Setting up your test…" : "Start mock test"}
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <History className="size-4 text-muted-foreground" />
          Recent tests
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Timer className="size-5" />}
            title="No mock tests yet"
            description="Simulate exam conditions with a timed test — your results will appear here."
          />
        ) : (
          <ul className="space-y-2.5">
            {recent.map((test) => {
              const info = statusInfo(test);
              const href =
                test.status === "active"
                  ? `/tests/session/${test.id}`
                  : `/tests/session/${test.id}/results`;
              return (
                <li key={test.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{test.startedLabel}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {test.status === "completed"
                          ? `Scored ${test.correctCount} / ${test.totalQuestions}`
                          : `${test.totalQuestions} questions`}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("border-transparent", info.className)}>
                      {info.label}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
