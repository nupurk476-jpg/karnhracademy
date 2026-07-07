"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TriangleAlert,
  Sparkles,
  CircleSlash,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Check,
  Send,
  X,
  PencilRuler,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { transitionQuestions, bulkEditQuestions } from "@/lib/actions/review";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge, DifficultyBadge } from "@/components/shared/badges";
import type { QuestionStatus, SyllabusUnit, Topic } from "@/lib/types";
import type { ReviewRow } from "./page";

export function ReviewList({
  questions,
  units,
  topics,
  page,
  pageSize,
  totalCount,
  status,
}: {
  questions: ReviewRow[];
  units: SyllabusUnit[];
  topics: Topic[];
  page: number;
  pageSize: number;
  totalCount: number;
  status: QuestionStatus;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Selections must not silently survive filter/page changes — bulk actions
  // would hit rows that are no longer on screen.
  const filterKey = searchParams.toString();
  useEffect(() => {
    setSelected(new Set());
  }, [filterKey]);

  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const allSelected = questions.length > 0 && questions.every((q) => selected.has(q.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runTransition(action: "approve" | "publish" | "reject" | "unpublish") {
    const ids = [...selected];
    startTransition(async () => {
      const result = await transitionQuestions({ ids, action });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const verb =
        action === "approve" ? "approved" : action === "publish" ? "published" : action === "reject" ? "rejected" : "unpublished";
      toast.success(
        `${result.data.updated} ${result.data.updated === 1 ? "question" : "questions"} ${verb}.` +
          (result.data.blocked > 0
            ? ` ${result.data.blocked} skipped (missing a confirmed answer).`
            : ""),
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-5" />}
        title={status === "pending_review" ? "Review queue is clear" : "Nothing here"}
        description={
          status === "pending_review"
            ? "New uploads land here after AI processing. Great work staying on top of it!"
            : "No questions match the current filters."
        }
        action={
          page > 1 ? (
            <Button variant="outline" size="sm" onClick={() => goToPage(1)}>
              Back to first page
            </Button>
          ) : undefined
        }
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className={cn("space-y-3", selected.size > 0 && "pb-24")}>
      <div className="flex items-center gap-3 px-1">
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
          aria-label="Select all on this page"
        />
        <span className="text-sm text-muted-foreground">
          {selected.size > 0 ? `${selected.size} selected` : "Select all on page"}
        </span>
      </div>

      <ul className="space-y-2.5">
        {questions.map((q) => {
          const topic = q.topic_id ? topicById.get(q.topic_id) : undefined;
          const unit = q.unit_id ? unitById.get(q.unit_id) : undefined;
          const missingAnswer = !q.correct_options?.length && !q.answer_text;
          return (
            <li
              key={q.id}
              className={cn(
                "flex gap-3 rounded-2xl border bg-card p-4 transition-colors",
                selected.has(q.id) && "border-primary/60 bg-accent/40",
              )}
            >
              <Checkbox
                className="mt-1"
                checked={selected.has(q.id)}
                onCheckedChange={() => toggle(q.id)}
                aria-label="Select question"
              />
              <div className="min-w-0 flex-1">
                <Link href={`/faculty/review/${q.id}`} className="group block">
                  <p className="line-clamp-2 text-sm font-medium leading-relaxed group-hover:text-primary">
                    {q.stem}
                  </p>
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ConfidenceBadge value={q.overall_confidence} />
                  <DifficultyBadge difficulty={q.difficulty} />
                  <Badge variant="outline" className="text-muted-foreground">
                    {topic ? topic.title : unit ? unit.title : "Unclassified"}
                  </Badge>
                  {missingAnswer && (
                    <Badge variant="outline" className="gap-1 border-transparent bg-destructive/10 text-destructive">
                      <CircleSlash className="size-3" /> No answer
                    </Badge>
                  )}
                  {!q.explanation && !missingAnswer && (
                    <Badge variant="outline" className="text-muted-foreground">
                      No explanation
                    </Badge>
                  )}
                  {q.explanation_is_ai && (
                    <Badge variant="outline" className="gap-1 border-transparent bg-accent text-accent-foreground">
                      <Sparkles className="size-3" /> AI draft
                    </Badge>
                  )}
                  {q.import_warnings.length > 0 && (
                    <Badge variant="outline" className="gap-1 border-transparent bg-warning/15 text-warning-foreground dark:text-warning">
                      <TriangleAlert className="size-3" /> {q.import_warnings.length}
                    </Badge>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages} · {totalCount} questions
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:left-60">
          <div className="container flex max-w-5xl flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-medium tabular-nums">
              {selected.size} selected
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={pending} onClick={() => setBulkEditOpen(true)}>
              <PencilRuler className="size-3.5" /> Bulk edit
            </Button>
            {status === "pending_review" && (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={pending} onClick={() => runTransition("approve")}>
                <Check className="size-3.5" /> Approve
              </Button>
            )}
            {(status === "pending_review" || status === "approved") && (
              <>
                <Button size="sm" className="gap-1.5" disabled={pending} onClick={() => runTransition("publish")}>
                  {pending ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />} Publish
                </Button>
                <Button size="sm" variant="destructive" className="gap-1.5" disabled={pending} onClick={() => runTransition("reject")}>
                  <X className="size-3.5" /> Reject
                </Button>
              </>
            )}
            {status === "published" && (
              <Button size="sm" variant="destructive" className="gap-1.5" disabled={pending} onClick={() => runTransition("unpublish")}>
                <X className="size-3.5" /> Unpublish
              </Button>
            )}
          </div>
        </div>
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        units={units}
        topics={topics}
        selectedIds={[...selected]}
        onDone={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />
    </div>
  );
}

function BulkEditDialog({
  open,
  onOpenChange,
  units,
  topics,
  selectedIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: SyllabusUnit[];
  topics: Topic[];
  selectedIds: string[];
  onDone: () => void;
}) {
  const [unitId, setUnitId] = useState<string>("keep");
  const [topicId, setTopicId] = useState<string>("keep");
  const [difficulty, setDifficulty] = useState<string>("keep");
  const [pending, startTransition] = useTransition();

  // Fresh dialog per open — leftover choices from a previous bulk edit must
  // never silently apply to a new selection.
  useEffect(() => {
    if (open) {
      setUnitId("keep");
      setTopicId("keep");
      setDifficulty("keep");
    }
  }, [open]);

  const unitTopics = topics.filter((t) => t.unit_id === unitId);

  function apply() {
    const payload: Parameters<typeof bulkEditQuestions>[0] = { ids: selectedIds };
    if (unitId !== "keep") {
      payload.unit_id = unitId === "none" ? null : unitId;
      payload.topic_id = topicId !== "keep" && topicId !== "none" ? topicId : null;
    } else if (topicId !== "keep") {
      payload.topic_id = topicId === "none" ? null : topicId;
    }
    if (difficulty !== "keep") {
      payload.difficulty = difficulty === "none" ? null : (difficulty as "easy" | "medium" | "hard");
    }

    startTransition(async () => {
      const result = await bulkEditQuestions(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Updated ${result.data.updated} questions.`);
      onOpenChange(false);
      onDone();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk edit {selectedIds.length} questions</DialogTitle>
          <DialogDescription>
            Only the fields you change are applied; everything else is kept.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={unitId} onValueChange={(v) => { setUnitId(v); setTopicId("keep"); }}>
            <SelectTrigger>
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Unit — keep as is</SelectItem>
              <SelectItem value="none">Clear unit</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.code} · {u.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {unitId !== "keep" && unitId !== "none" && (
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">Topic — leave empty</SelectItem>
                {unitTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Difficulty — keep as is</SelectItem>
              <SelectItem value="none">Clear difficulty</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={pending}>
            {pending ? <Spinner className="size-4" /> : "Apply changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
