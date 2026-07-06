"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, SlidersHorizontal, Sparkles } from "lucide-react";
import { startSession } from "@/lib/actions/practice";
import { Button } from "@/components/ui/button";
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
import type { DifficultyLevel, SyllabusUnit, Topic } from "@/lib/types";

type Mode = "adaptive" | "custom";
type DifficultyChoice = DifficultyLevel | "any";

const COUNTS = [5, 10, 20, 30] as const;
const DIFFICULTIES: { value: DifficultyChoice; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

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

export function PracticeSetup({
  units,
  topics,
  initialMode,
  initialUnitId,
  initialTopicId,
}: {
  units: SyllabusUnit[];
  topics: Topic[];
  initialMode: Mode;
  initialUnitId: string | null;
  initialTopicId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [unitId, setUnitId] = useState<string>(initialUnitId ?? "all");
  const [topicId, setTopicId] = useState<string>(initialTopicId ?? "all");
  const [difficulty, setDifficulty] = useState<DifficultyChoice>("any");
  const [count, setCount] = useState<number>(10);

  const filteredTopics =
    unitId === "all" ? topics : topics.filter((t) => t.unit_id === unitId);

  function onUnitChange(value: string) {
    setUnitId(value);
    // Reset the topic when it no longer belongs to the chosen unit.
    if (value !== "all" && !topics.some((t) => t.id === topicId && t.unit_id === value)) {
      setTopicId("all");
    }
  }

  function onStart() {
    startTransition(async () => {
      const result = await startSession({
        kind: mode === "adaptive" ? "adaptive" : "practice",
        unitId: mode === "custom" && unitId !== "all" ? unitId : null,
        topicId: mode === "custom" && topicId !== "all" ? topicId : null,
        difficulty: mode === "custom" && difficulty !== "any" ? difficulty : null,
        count,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/practice/session/${result.data.sessionId}`);
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Practice mode">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "adaptive"}
          onClick={() => setMode("adaptive")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            mode === "adaptive"
              ? "border-primary bg-accent"
              : "bg-background hover:bg-accent/50",
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold">Adaptive</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Recommended — targets your weak spots automatically.
          </p>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "custom"}
          onClick={() => setMode("custom")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            mode === "custom"
              ? "border-primary bg-accent"
              : "bg-background hover:bg-accent/50",
          )}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <span className="text-sm font-semibold">Custom</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a unit, topic and difficulty yourself.
          </p>
        </button>
      </div>

      {mode === "custom" && (
        <div className="animate-fade-in-up space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="practice-unit">Unit</Label>
            <Select value={unitId} onValueChange={onUnitChange}>
              <SelectTrigger id="practice-unit">
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

          <div className="space-y-1.5">
            <Label htmlFor="practice-topic">Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger id="practice-topic">
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {filteredTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d.value}
                  selected={difficulty === d.value}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Number of questions</Label>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <Chip key={c} selected={count === c} onClick={() => setCount(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="h-12 w-full rounded-xl text-base"
        onClick={onStart}
        disabled={pending}
      >
        {pending ? <Spinner className="size-5" /> : <Play className="!size-5" />}
        {pending ? "Preparing your session…" : "Start practice"}
      </Button>
    </div>
  );
}
