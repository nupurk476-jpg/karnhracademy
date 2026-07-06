"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Send, TimerIcon, TriangleAlert } from "lucide-react";
import { completeSession, submitAnswer } from "@/lib/actions/practice";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PracticeSession, Question } from "@/lib/types";

export interface SavedAnswer {
  options: string[] | null;
  text: string | null;
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function MockRunner({
  session,
  questions,
  initialAnswers,
}: {
  session: PracticeSession;
  questions: Question[];
  initialAnswers: Record<string, SavedAnswer>;
}) {
  const router = useRouter();
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>(initialAnswers);
  const [draft, setDraft] = useState<string[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [finishing, setFinishing] = useState(false);
  // null until mounted so the SSR HTML and first client render agree.
  const [now, setNow] = useState<number | null>(null);

  const submittedRef = useRef(false);
  const questionStartRef = useRef(Date.now());

  const current = questions[index];
  const currentAnswer: SavedAnswer | undefined = answers[current.id];
  const isMulti = current.question_type === "mcq_multi";
  const isText =
    current.question_type === "numeric" || current.question_type === "descriptive";
  const hasOptions = Boolean(current.options && current.options.length > 0);
  const answeredCount = Object.keys(answers).length;

  const endsAtMs = session.ends_at ? new Date(session.ends_at).getTime() : null;
  const remainingMs =
    endsAtMs === null || now === null ? null : Math.max(0, endsAtMs - now);
  const lowTime = remainingMs !== null && remainingMs < 2 * 60 * 1000;

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const finish = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setFinishing(true);
      const result = await completeSession(session.id);
      if (!result.ok) {
        toast.error(result.error);
        submittedRef.current = false;
        setFinishing(false);
        return;
      }
      if (auto) toast.info("Time's up — your test was submitted automatically.");
      router.replace(`/tests/session/${session.id}/results`);
    },
    [router, session.id],
  );

  // Auto-submit the moment the clock hits zero.
  useEffect(() => {
    if (remainingMs === 0 && !submittedRef.current) void finish(true);
  }, [remainingMs, finish]);

  function goTo(i: number) {
    if (i < 0 || i >= total || i === index) return;
    setIndex(i);
    setDraft([]);
    setTextDraft("");
    questionStartRef.current = Date.now();
  }

  /** Save locally, then fire-and-forget to the server (mocks return no feedback). */
  function commitAnswer(question: Question, options: string[] | null, text: string | null) {
    if (answers[question.id] || finishing) return;
    setAnswers((prev) => ({ ...prev, [question.id]: { options, text } }));
    const timeTakenMs = Math.min(Date.now() - questionStartRef.current, 3_600_000);
    void submitAnswer({
      sessionId: session.id,
      questionId: question.id,
      selectedOptions: options,
      answerText: text,
      timeTakenMs,
    })
      .then((result) => {
        if (!result.ok) {
          setAnswers((prev) => {
            const next = { ...prev };
            delete next[question.id];
            return next;
          });
          toast.error(`${result.error} Your answer wasn't saved — please retry.`);
        }
      })
      .catch(() => {
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[question.id];
          return next;
        });
        toast.error("Network error — your answer wasn't saved, please retry.");
      });
  }

  function onOptionClick(key: string) {
    if (currentAnswer || finishing) return;
    if (isMulti) {
      setDraft((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    } else {
      commitAnswer(current, [key], null);
    }
  }

  const selectedKeys = currentAnswer?.options ?? draft;

  return (
    <div className="flex min-h-full flex-col">
      {/* Sticky exam header */}
      <div className="sticky top-14 z-30 border-b bg-background/95 backdrop-blur md:top-0">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div
            className={cn(
              "flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums",
              lowTime ? "animate-pulse text-destructive" : "text-foreground",
            )}
            role="timer"
            aria-label="Time remaining"
          >
            <TimerIcon className="size-4" />
            {remainingMs === null ? "--:--" : formatClock(remainingMs)}
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            Answered <span className="font-semibold text-foreground">{answeredCount}</span>/{total}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="rounded-lg" disabled={finishing}>
                {finishing ? <Spinner className="size-4" /> : <Send className="size-4" />}
                Submit test
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit your test?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have answered {answeredCount} of {total} questions.
                  {answeredCount < total &&
                    ` The ${total - answeredCount} unanswered ${
                      total - answeredCount === 1 ? "question" : "questions"
                    } will be marked as skipped.`}{" "}
                  You can&apos;t change answers after submitting.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep going</AlertDialogCancel>
                <AlertDialogAction onClick={() => void finish(false)} disabled={finishing}>
                  Submit now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Question palette */}
        <div className="no-scrollbar mx-auto flex w-full max-w-3xl gap-2 overflow-x-auto px-4 pb-2.5 md:px-8">
          {questions.map((q, i) => {
            const isAnswered = Boolean(answers[q.id]);
            const isCurrent = i === index;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${i + 1}${isAnswered ? ", answered" : ", not answered"}`}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors",
                  isAnswered
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isCurrent && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 md:px-8">
        <div key={current.id} className="animate-fade-in-up rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question {index + 1} of {total}
            </p>
            {isMulti && (
              <Badge variant="outline" className="text-muted-foreground">
                Select all that apply
              </Badge>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-relaxed md:text-lg">
            {current.stem}
          </p>

          {!isText && !hasOptions && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/15 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>This question is missing its options — skip it and move on.</p>
            </div>
          )}

          {!isText && hasOptions && (
            <div className="mt-5 space-y-2.5">
              {current.options!.map((option) => {
                const isSelected = selectedKeys.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={Boolean(currentAnswer) || finishing}
                    aria-pressed={isSelected}
                    onClick={() => onOptionClick(option.key)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default md:text-base",
                      isSelected
                        ? "border-primary bg-accent"
                        : currentAnswer
                          ? "bg-card opacity-60"
                          : "bg-card hover:border-primary/40 hover:bg-accent/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {option.key}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap">{option.text}</span>
                  </button>
                );
              })}
              {isMulti && !currentAnswer && (
                <Button
                  className="mt-2 h-11 w-full rounded-xl"
                  disabled={draft.length === 0 || finishing}
                  onClick={() => commitAnswer(current, draft, null)}
                >
                  Save answer
                </Button>
              )}
            </div>
          )}

          {isText && (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (textDraft.trim()) commitAnswer(current, null, textDraft.trim());
              }}
            >
              {currentAnswer ? (
                <p className="whitespace-pre-wrap rounded-xl border bg-muted/50 px-4 py-3 text-sm">
                  {currentAnswer.text}
                </p>
              ) : current.question_type === "numeric" ? (
                <Input
                  inputMode="decimal"
                  placeholder="Type your answer…"
                  value={textDraft}
                  disabled={finishing}
                  onChange={(e) => setTextDraft(e.target.value)}
                  aria-label="Your answer"
                />
              ) : (
                <Textarea
                  rows={4}
                  placeholder="Write your answer…"
                  value={textDraft}
                  disabled={finishing}
                  onChange={(e) => setTextDraft(e.target.value)}
                  aria-label="Your answer"
                />
              )}
              {!currentAnswer && (
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl"
                  disabled={!textDraft.trim() || finishing}
                >
                  Save answer
                </Button>
              )}
            </form>
          )}

          {currentAnswer && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-success" />
              Answer recorded — feedback comes with your results.
            </p>
          )}
        </div>

        {/* Prev / next */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
          >
            <ArrowLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => goTo(index + 1)}
            disabled={index + 1 >= total}
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
