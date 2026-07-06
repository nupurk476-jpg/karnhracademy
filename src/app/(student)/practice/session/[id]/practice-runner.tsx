"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Info,
  Sparkles,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import {
  completeSession,
  submitAnswer,
  toggleBookmark,
  type AnswerFeedback,
} from "@/lib/actions/practice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ProgressRing } from "@/components/shared/progress-ring";
import { DifficultyBadge } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import type { PracticeSession, Question } from "@/lib/types";

type Phase = "answering" | "answered" | "summary";

const OPTION_KEYS_RE = /^[1-9]$/;
const OPTION_LETTERS_RE = /^[a-hA-H]$/;

function AIBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-transparent bg-accent text-accent-foreground">
      <Sparkles className="size-3" />
      AI-generated
    </Badge>
  );
}

export function PracticeRunner({
  session,
  questions,
  bookmarkedIds,
}: {
  session: PracticeSession;
  questions: Question[];
  bookmarkedIds: string[];
}) {
  const router = useRouter();
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selected, setSelected] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(
    () => new Set(bookmarkedIds),
  );
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // One entry per submitted answer: true/false = graded, null = recorded only.
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  const questionStartRef = useRef(Date.now());
  const completedRef = useRef(false);

  const current = questions[index];
  const isMulti = current?.question_type === "mcq_multi";
  const hasOptions = Boolean(current?.options && current.options.length > 0);
  const needsOptions =
    current?.question_type === "mcq_single" ||
    current?.question_type === "mcq_multi" ||
    current?.question_type === "true_false";

  const handleSubmit = useCallback(
    async (options: string[] | null, text: string | null) => {
      if (!current || submitting || phase !== "answering") return;
      setSubmitting(true);
      const result = await submitAnswer({
        sessionId: session.id,
        questionId: current.id,
        selectedOptions: options,
        answerText: text,
        timeTakenMs: Math.min(Date.now() - questionStartRef.current, 3_600_000),
      });
      setSubmitting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (options) setSelected(options);
      setFeedback(result.data);
      setResults((prev) => [...prev, result.data.isCorrect]);
      setPhase("answered");
    },
    [current, submitting, phase, session.id],
  );

  const finish = useCallback(async () => {
    setPhase("summary");
    if (completedRef.current) return;
    completedRef.current = true;
    const result = await completeSession(session.id);
    if (!result.ok) toast.error(result.error);
  }, [session.id]);

  const goNext = useCallback(() => {
    if (index + 1 >= total) {
      void finish();
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setTextAnswer("");
    setFeedback(null);
    setAiText(null);
    setAiLoading(false);
    setPhase("answering");
    questionStartRef.current = Date.now();
  }, [index, total, finish]);

  function skipQuestion() {
    setSkippedCount((n) => n + 1);
    goNext();
  }

  function toggleMultiOption(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function onOptionClick(key: string) {
    if (phase !== "answering" || submitting) return;
    if (isMulti) {
      toggleMultiOption(key);
    } else {
      setSelected([key]);
      void handleSubmit([key], null);
    }
  }

  // Keyboard shortcuts: 1-9 / A-H select options, Enter advances.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase === "summary" || ending) return;
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "Enter") {
        if (phase === "answered") {
          event.preventDefault();
          goNext();
        } else if (phase === "answering" && isMulti && selected.length > 0) {
          event.preventDefault();
          void handleSubmit(selected, null);
        }
        return;
      }
      if (phase !== "answering" || !current?.options?.length) return;
      let optionIndex = -1;
      if (OPTION_KEYS_RE.test(event.key)) optionIndex = Number(event.key) - 1;
      else if (OPTION_LETTERS_RE.test(event.key)) {
        optionIndex = event.key.toLowerCase().charCodeAt(0) - 97;
      }
      if (optionIndex < 0 || optionIndex >= current.options.length) return;
      event.preventDefault();
      onOptionClick(current.options[optionIndex].key);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected, submitting, index, ending, isMulti, current, goNext, handleSubmit]);

  async function onToggleBookmark() {
    if (!current) return;
    const id = current.id;
    const wasBookmarked = bookmarked.has(id);
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(id);
      else next.add(id);
      return next;
    });
    const result = await toggleBookmark(id);
    if (!result.ok) {
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.error(result.error);
    }
  }

  async function explainWithAI() {
    if (!current || aiLoading) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id }),
      });
      const json = (await response.json()) as { explanation?: string; error?: string };
      if (!response.ok || !json.explanation) {
        throw new Error(json.error ?? "Could not generate an explanation.");
      }
      setAiText(json.explanation);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate an explanation.");
    } finally {
      setAiLoading(false);
    }
  }

  async function endEarly() {
    setEnding(true);
    const result = await completeSession(session.id);
    if (!result.ok) {
      toast.error(result.error);
      setEnding(false);
      return;
    }
    router.push("/practice");
  }

  /* ── Summary ─────────────────────────────────────────────────────────── */
  if (phase === "summary") {
    const graded = results.filter((r) => r !== null).length;
    const correct = results.filter((r) => r === true).length;
    const recorded = results.filter((r) => r === null).length;
    const accuracy = graded > 0 ? correct / graded : 0;

    return (
      <div className="mx-auto flex w-full max-w-md animate-fade-in-up flex-col items-center px-4 py-12 text-center md:py-16">
        <ProgressRing value={accuracy} size={132} strokeWidth={10}>
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {graded > 0 ? Math.round(accuracy * 100) : "—"}
              {graded > 0 && <span className="text-lg">%</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">accuracy</p>
          </div>
        </ProgressRing>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Session complete</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {correct > 0
            ? `You got ${correct} of ${graded} graded questions right. Keep the momentum going!`
            : "Every attempt counts — review the explanations and try again."}
        </p>
        <div className="mt-6 grid w-full grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-card p-3">
            <p className="text-xl font-bold tabular-nums text-success">{correct}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="rounded-2xl border bg-card p-3">
            <p className="text-xl font-bold tabular-nums text-destructive">
              {graded - correct}
            </p>
            <p className="text-xs text-muted-foreground">Incorrect</p>
          </div>
          <div className="rounded-2xl border bg-card p-3">
            <p className="text-xl font-bold tabular-nums">{recorded + skippedCount}</p>
            <p className="text-xs text-muted-foreground">Ungraded</p>
          </div>
        </div>
        <div className="mt-8 flex w-full flex-col gap-3">
          <Button asChild size="lg" className="h-12 rounded-xl">
            <Link href="/practice">Practice again</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-xl">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Question view ───────────────────────────────────────────────────── */
  const answeredSoFar = results.length + skippedCount;
  const graded = feedback ? feedback.isCorrect !== null : false;
  const correctSet = new Set(feedback?.correctOptions ?? []);
  const explanation = feedback?.explanation ?? aiText;
  const explanationIsAI = feedback?.explanation ? feedback.explanationIsAI : aiText !== null;

  function optionClasses(key: string): string {
    const isSelected = selected.includes(key);
    if (phase === "answered" && feedback) {
      if (graded) {
        if (correctSet.has(key)) {
          return "border-success bg-success/15 text-success";
        }
        if (isSelected) {
          return "border-destructive bg-destructive/10 text-destructive";
        }
        return "border-border bg-card opacity-60";
      }
      // Ungraded — neutral "recorded" highlight on the chosen option.
      return isSelected
        ? "border-primary bg-accent"
        : "border-border bg-card opacity-60";
    }
    return isSelected
      ? "border-primary bg-accent"
      : "border-border bg-card hover:border-primary/40 hover:bg-accent/50";
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4 md:px-8 md:py-8">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Progress
          value={(answeredSoFar / total) * 100}
          className="h-2 flex-1"
          aria-label="Session progress"
        />
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {Math.min(index + 1, total)} of {total}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="End session"
            >
              <X className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End this session?</AlertDialogTitle>
              <AlertDialogDescription>
                Your answers so far are saved. You can start a new session any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep practicing</AlertDialogCancel>
              <AlertDialogAction onClick={endEarly} disabled={ending}>
                {ending ? <Spinner className="size-4" /> : "End session"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Question card */}
      <div key={current.id} className="mt-5 animate-fade-in-up">
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={current.difficulty} />
            {isMulti && (
              <Badge variant="outline" className="text-muted-foreground">
                Select all that apply
              </Badge>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-relaxed md:text-lg">
            {current.stem}
          </p>

          {/* Options */}
          {needsOptions && !hasOptions && (
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/15 p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>This question is missing its options and can&apos;t be answered here.</p>
              </div>
              <Button variant="outline" onClick={skipQuestion}>
                Skip this question
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {needsOptions && hasOptions && (
            <div className="mt-5 space-y-2.5">
              {current.options!.map((option, i) => {
                const isSelected = selected.includes(option.key);
                const showCorrect =
                  phase === "answered" && graded && correctSet.has(option.key);
                const showWrong =
                  phase === "answered" && graded && isSelected && !correctSet.has(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={phase !== "answering" || submitting}
                    aria-pressed={isSelected}
                    onClick={() => onOptionClick(option.key)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default md:text-base",
                      optionClasses(option.key),
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                        isSelected && phase === "answering"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {option.key || String(i + 1)}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap">{option.text}</span>
                    {showCorrect && <CheckCircle2 className="size-5 shrink-0 text-success" />}
                    {showWrong && <XCircle className="size-5 shrink-0 text-destructive" />}
                  </button>
                );
              })}
              {isMulti && phase === "answering" && (
                <Button
                  className="mt-2 h-11 w-full rounded-xl"
                  disabled={selected.length === 0 || submitting}
                  onClick={() => void handleSubmit(selected, null)}
                >
                  {submitting ? <Spinner className="size-4" /> : "Check answer"}
                </Button>
              )}
            </div>
          )}

          {/* Numeric / descriptive input */}
          {!needsOptions && (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (textAnswer.trim()) void handleSubmit(null, textAnswer.trim());
              }}
            >
              {current.question_type === "numeric" ? (
                <Input
                  inputMode="decimal"
                  placeholder="Type your answer…"
                  value={textAnswer}
                  disabled={phase !== "answering" || submitting}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  aria-label="Your answer"
                />
              ) : (
                <Textarea
                  rows={4}
                  placeholder="Write your answer…"
                  value={textAnswer}
                  disabled={phase !== "answering" || submitting}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  aria-label="Your answer"
                />
              )}
              {phase === "answering" && (
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl"
                  disabled={!textAnswer.trim() || submitting}
                >
                  {submitting ? <Spinner className="size-4" /> : "Submit answer"}
                </Button>
              )}
            </form>
          )}
        </div>

        {/* Feedback panel */}
        {phase === "answered" && feedback && (
          <div
            className={cn(
              "mt-4 animate-fade-in-up rounded-2xl border p-4 sm:p-5",
              feedback.isCorrect === true && "border-success/50 bg-success/15",
              feedback.isCorrect === false && "border-destructive/50 bg-destructive/10",
              feedback.isCorrect === null && "bg-card",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {feedback.isCorrect === true && (
                  <>
                    <CheckCircle2 className="size-5 text-success" />
                    <p className="font-semibold text-success">Correct!</p>
                  </>
                )}
                {feedback.isCorrect === false && (
                  <>
                    <XCircle className="size-5 text-destructive" />
                    <p className="font-semibold text-destructive">Not quite</p>
                  </>
                )}
                {feedback.isCorrect === null && (
                  <>
                    <Info className="size-5 text-muted-foreground" />
                    <p className="font-semibold">Recorded</p>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onToggleBookmark}
                aria-label={
                  bookmarked.has(current.id) ? "Remove bookmark" : "Bookmark this question"
                }
              >
                <Bookmark
                  className={cn(
                    "size-4",
                    bookmarked.has(current.id) && "fill-primary text-primary",
                  )}
                />
              </Button>
            </div>

            {feedback.isCorrect !== true && feedback.answerText && (
              <p className="mt-2 text-sm">
                <span className="font-medium">
                  {feedback.isCorrect === null ? "Model answer: " : "Correct answer: "}
                </span>
                <span className="whitespace-pre-wrap">{feedback.answerText}</span>
              </p>
            )}

            {explanation ? (
              <div className="mt-3 rounded-xl bg-background/70 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Explanation
                  </p>
                  {explanationIsAI && <AIBadge />}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                  {explanation}
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg bg-background"
                onClick={explainWithAI}
                disabled={aiLoading}
              >
                {aiLoading ? <Spinner className="size-4" /> : <Sparkles className="size-4" />}
                {aiLoading ? "Thinking…" : "Explain with AI"}
              </Button>
            )}

            <Button className="mt-4 h-11 w-full rounded-xl" onClick={goNext}>
              {index + 1 >= total ? "See summary" : "Next question"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <p className="mt-6 hidden text-center text-xs text-muted-foreground md:block">
        Tip: press 1-4 or A-D to answer, Enter to continue.
      </p>
    </div>
  );
}
