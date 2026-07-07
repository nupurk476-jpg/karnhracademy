"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Send,
  X,
  Plus,
  Trash2,
  Sparkles,
  TriangleAlert,
  FileText,
  History,
  CopyX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveQuestion, transitionQuestions } from "@/lib/actions/review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, ConfidenceBadge } from "@/components/shared/badges";
import type { Question, QuestionOption, QuestionType, SyllabusUnit, Topic } from "@/lib/types";
import type { DuplicateInfo, RevisionInfo } from "./page";

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq_single: "Multiple choice (single)",
  mcq_multi: "Multiple choice (multi)",
  true_false: "True / False",
  numeric: "Numeric answer",
  descriptive: "Descriptive",
};

const LETTERS = "ABCDEFGHIJ";

export function QuestionEditor({
  question,
  units,
  topics,
  document,
  duplicates,
  revisions,
}: {
  question: Question;
  units: SyllabusUnit[];
  topics: Topic[];
  document: { file_name: string; page_count: number | null; needs_ocr: boolean } | null;
  duplicates: DuplicateInfo[];
  revisions: RevisionInfo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [stem, setStem] = useState(question.stem);
  const [type, setType] = useState<QuestionType>(question.question_type);
  const [options, setOptions] = useState<QuestionOption[]>(question.options ?? []);
  const [correct, setCorrect] = useState<string[]>(question.correct_options ?? []);
  const [answerText, setAnswerText] = useState(question.answer_text ?? "");
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [unitId, setUnitId] = useState(question.unit_id ?? "none");
  const [topicId, setTopicId] = useState(question.topic_id ?? "none");
  const [difficulty, setDifficulty] = useState(question.difficulty ?? "none");
  const [keywords, setKeywords] = useState(question.keywords.join(", "));

  const unitTopics = topics.filter((t) => t.unit_id === unitId);
  const isMCQ = type === "mcq_single" || type === "mcq_multi" || type === "true_false";
  const confidence = question.confidence ?? {};

  function toggleCorrect(key: string) {
    if (type === "mcq_single" || type === "true_false") {
      setCorrect(correct.includes(key) ? [] : [key]);
    } else {
      setCorrect(
        correct.includes(key) ? correct.filter((k) => k !== key) : [...correct, key],
      );
    }
  }

  function updateOption(index: number, text: string) {
    setOptions(options.map((o, i) => (i === index ? { ...o, text } : o)));
  }

  function addOption() {
    if (options.length >= 10) return;
    setOptions([...options, { key: LETTERS[options.length], text: "" }]);
  }

  function removeOption(index: number) {
    const removed = options[index];
    const next = options
      .filter((_, i) => i !== index)
      .map((o, i) => ({ ...o, key: LETTERS[i] }));
    setOptions(next);
    setCorrect(correct.filter((k) => k !== removed.key).map((k) => {
      // Re-map keys after re-lettering
      const oldIndex = options.findIndex((o) => o.key === k);
      const shift = oldIndex > index ? -1 : 0;
      return LETTERS[oldIndex + shift] ?? k;
    }));
  }

  function buildPayload() {
    return {
      id: question.id,
      stem: stem.trim(),
      question_type: type,
      options: isMCQ && options.length > 0 ? options.map((o) => ({ key: o.key, text: o.text.trim() })) : null,
      correct_options: isMCQ && correct.length > 0 ? correct : null,
      answer_text: !isMCQ && answerText.trim() ? answerText.trim() : null,
      explanation: explanation.trim() ? explanation.trim() : null,
      unit_id: unitId === "none" ? null : unitId,
      topic_id: topicId === "none" ? null : topicId,
      difficulty: difficulty === "none" ? null : (difficulty as "easy" | "medium" | "hard"),
      keywords: keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    };
  }

  function save(after?: "approve" | "publish") {
    startTransition(async () => {
      const result = await saveQuestion(buildPayload());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (after) {
        const t = await transitionQuestions({ ids: [question.id], action: after });
        if (!t.ok) {
          toast.error(t.error);
          return;
        }
        if (t.data.updated === 0) {
          toast.error(
            after === "publish"
              ? "Saved, but not published — the question needs a confirmed answer."
              : "Saved, but the status could not be changed.",
          );
          router.refresh();
          return;
        }
        toast.success(after === "publish" ? "Published — students can now see it." : "Approved.");
        router.push("/faculty/review");
        return;
      }
      toast.success("Saved.");
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const result = await transitionQuestions({ ids: [question.id], action: "reject" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.updated === 0) {
        toast.error("This question can't be rejected from its current status.");
        return;
      }
      toast.success("Question rejected.");
      router.push("/faculty/review");
    });
  }

  const canReject = ["pending_review", "approved", "archived"].includes(question.status);
  const canPublish = ["pending_review", "approved", "archived"].includes(question.status);

  return (
    <div className="container max-w-6xl animate-fade-in-up py-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href="/faculty/review">
            <ArrowLeft className="size-4" /> Review Queue
          </Link>
        </Button>
        <StatusBadge status={question.status} />
        <ConfidenceBadge value={question.overall_confidence} />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => save()}>
            Save
          </Button>
          {question.status === "pending_review" && (
            <Button variant="outline" size="sm" className="gap-1.5" disabled={pending} onClick={() => save("approve")}>
              <Check className="size-3.5" /> Save & approve
            </Button>
          )}
          {canPublish && (
            <Button size="sm" className="gap-1.5" disabled={pending} onClick={() => save("publish")}>
              {pending ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />} Save & publish
            </Button>
          )}
        </div>
      </div>

      {/* Import warnings */}
      {question.import_warnings.length > 0 && (
        <div className="mb-5 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <TriangleAlert className="size-4 text-warning" /> Import warnings
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {question.import_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main editor */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stem">Question</Label>
              <FieldConfidence value={confidence.stem} />
            </div>
            <Textarea
              id="stem"
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={4}
              className="text-base leading-relaxed"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Question type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isMCQ && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Options{" "}
                  <span className="font-normal text-muted-foreground">
                    — tick the correct answer{type === "mcq_multi" ? "s" : ""}
                  </span>
                </Label>
                <FieldConfidence value={confidence.options} />
              </div>
              {options.length === 0 && (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  The source had no options for this question — add them below.
                </p>
              )}
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors",
                      correct.includes(option.key) && "border-success bg-success/5",
                    )}
                  >
                    <Checkbox
                      checked={correct.includes(option.key)}
                      onCheckedChange={() => toggleCorrect(option.key)}
                      aria-label={`Mark option ${option.key} correct`}
                    />
                    <span className="w-5 text-center text-sm font-semibold text-muted-foreground">
                      {option.key}
                    </span>
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${option.key}`}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground"
                      aria-label={`Remove option ${option.key}`}
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={addOption}>
                <Plus className="size-3.5" /> Add option
              </Button>
              {correct.length === 0 && (
                <p className="text-xs font-medium text-destructive">
                  No correct answer marked — this question can be saved but not published.
                </p>
              )}
            </div>
          )}

          {!isMCQ && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="answer">Answer</Label>
                <FieldConfidence value={confidence.answer} />
              </div>
              <Input
                id="answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={type === "numeric" ? "e.g. 254" : "Model answer (optional)"}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="explanation" className="flex items-center gap-2">
                Explanation
                {question.explanation_is_ai && (
                  <Badge variant="outline" className="gap-1 border-transparent bg-accent text-accent-foreground">
                    <Sparkles className="size-3" /> AI draft — verify before publishing
                  </Badge>
                )}
              </Label>
              <FieldConfidence value={confidence.explanation} />
            </div>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              placeholder="Why is the answer correct? Students see this after answering."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Syllabus unit</Label>
                <FieldConfidence value={confidence.classification} />
              </div>
              <Select
                value={unitId}
                onValueChange={(v) => {
                  setUnitId(v);
                  setTopicId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unclassified</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.code} · {u.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Select value={topicId} onValueChange={setTopicId} disabled={unitId === "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No topic</SelectItem>
                  {unitTopics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="comma, separated, keywords"
            />
          </div>

          {canReject && (
            <>
              <Separator />
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" disabled={pending} onClick={reject}>
                  <X className="size-3.5" /> Reject question
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {document && (
            <aside className="rounded-2xl border bg-card p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" /> Source
              </h3>
              <p className="break-words text-sm">{document.file_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {question.source_page ? `Page ${question.source_page}` : "Page unknown"}
                {question.source_order ? ` · Question #${question.source_order}` : ""}
                {document.needs_ocr ? " · via OCR" : ""}
              </p>
              {question.source_excerpt && (
                <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {question.source_excerpt}
                </pre>
              )}
            </aside>
          )}

          {duplicates.length > 0 && (
            <aside className="rounded-2xl border border-warning/40 bg-card p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CopyX className="size-4 text-warning" /> Possible duplicates
              </h3>
              <ul className="space-y-2.5">
                {duplicates.map((d) => (
                  <li key={d.pairId} className="text-sm">
                    <Link
                      href={`/faculty/review/${d.otherId}`}
                      className="line-clamp-2 hover:text-primary"
                    >
                      {d.otherStem}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {Math.round(d.similarity * 100)}% match · {d.method}
                    </p>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link href="/faculty/duplicates">Open Duplicate Manager</Link>
              </Button>
            </aside>
          )}

          <aside className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-muted-foreground" /> History
            </h3>
            {revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {revisions.map((r) => (
                  <li key={r.id} className="flex gap-2.5 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                    <div>
                      <p>
                        <span className="font-medium capitalize">{r.action.replace(/_/g, " ")}</span>
                        {r.actorName ? ` · ${r.actorName}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                      {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function FieldConfidence({ value }: { value: number | undefined }) {
  if (typeof value !== "number") return null;
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.85 ? "text-success" : value >= 0.6 ? "text-warning-foreground dark:text-warning" : "text-destructive";
  return (
    <span className={cn("text-xs font-medium tabular-nums", tone)}>
      {pct}% confidence
    </span>
  );
}
