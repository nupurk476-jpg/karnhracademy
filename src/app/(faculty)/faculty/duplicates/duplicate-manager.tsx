"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyCheck, Merge, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveDuplicate } from "@/lib/actions/review";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/shared/badges";
import type { DupePair, DupeQuestion } from "./page";

export function DuplicateManager({ pairs }: { pairs: DupePair[] }) {
  const router = useRouter();
  const [resolving, setResolving] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resolve(pairId: string, resolution: "merge" | "dismiss") {
    setResolving(pairId);
    startTransition(async () => {
      const result = await resolveDuplicate({ duplicatePairId: pairId, resolution });
      setResolving(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(resolution === "merge" ? "Merged — the older question was kept." : "Marked as not a duplicate.");
      router.refresh();
    });
  }

  if (pairs.length === 0) {
    return (
      <EmptyState
        icon={<CopyCheck className="size-5" />}
        title="No open duplicates"
        description="New potential duplicates appear here automatically as documents are imported."
      />
    );
  }

  return (
    <div className="space-y-4">
      {pairs.map((pair) => {
        const [older, newer] =
          new Date(pair.a.created_at) <= new Date(pair.b.created_at)
            ? [pair.a, pair.b]
            : [pair.b, pair.a];
        const busy = pending && resolving === pair.id;
        return (
          <div key={pair.id} className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent tabular-nums",
                  pair.similarity >= 0.98
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/15 text-warning-foreground dark:text-warning",
                )}
              >
                {Math.round(pair.similarity * 100)}% match
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {pair.method === "hash" ? "exact text" : pair.method}
              </Badge>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={() => resolve(pair.id, "dismiss")}
                >
                  <EyeOff className="size-3.5" /> Not a duplicate
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={busy}
                  onClick={() => resolve(pair.id, "merge")}
                >
                  {busy ? <Spinner className="size-3.5" /> : <Merge className="size-3.5" />} Merge
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DupeCard question={older} label="Kept on merge (older)" highlight />
              <DupeCard question={newer} label="Marked duplicate on merge" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DupeCard({
  question,
  label,
  highlight,
}: {
  question: DupeQuestion;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        highlight ? "border-success/50 bg-success/5" : "bg-muted/40",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <StatusBadge status={question.status} />
      </div>
      <Link
        href={`/faculty/review/${question.id}`}
        className="line-clamp-3 text-sm font-medium leading-relaxed hover:text-primary"
      >
        {question.stem}
      </Link>
      {question.options && question.options.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {question.options.slice(0, 4).map((o) => (
            <li key={o.key} className="truncate">
              <span
                className={cn(
                  "font-semibold",
                  question.correct_options?.includes(o.key) && "text-success",
                )}
              >
                {o.key}.
              </span>{" "}
              {o.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground" suppressHydrationWarning>
        Added {new Date(question.created_at).toLocaleDateString()}
        {question.explanation ? " · has explanation" : " · no explanation"}
      </p>
    </div>
  );
}
