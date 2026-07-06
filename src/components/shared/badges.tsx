import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DifficultyLevel, QuestionStatus } from "@/lib/types";

const STATUS_CONFIG: Record<QuestionStatus, { label: string; className: string }> = {
  processing: { label: "Processing", className: "bg-muted text-muted-foreground" },
  pending_review: { label: "Needs review", className: "bg-warning/15 text-warning-foreground dark:text-warning" },
  approved: { label: "Approved", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  published: { label: "Published", className: "bg-success/15 text-success" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  duplicate: { label: "Duplicate", className: "bg-muted text-muted-foreground line-through" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: QuestionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

const DIFFICULTY_CONFIG: Record<DifficultyLevel, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning-foreground dark:text-warning",
  hard: "bg-destructive/10 text-destructive",
};

export function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel | null }) {
  if (!difficulty) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No difficulty
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", DIFFICULTY_CONFIG[difficulty])}>
      {difficulty}
    </Badge>
  );
}

/**
 * Confidence indicator: how sure the AI pipeline was about an extracted
 * question. Low scores are the review queue's primary triage signal.
 */
export function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        Unscored
      </Badge>
    );
  }
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.85
      ? { dot: "bg-success", text: "text-success" }
      : value >= 0.6
        ? { dot: "bg-warning", text: "text-warning-foreground dark:text-warning" }
        : { dot: "bg-destructive", text: "text-destructive" };

  return (
    <Badge variant="outline" className={cn("gap-1.5 tabular-nums", tone.text)}>
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {pct}%
    </Badge>
  );
}
