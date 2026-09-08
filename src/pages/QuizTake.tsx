import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchQuizQuestions } from "@/lib/quizQuestions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { track, EVENTS } from "@/lib/analytics";
import QuizLeaderboard from "@/components/QuizLeaderboard";
import {
  ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, XCircle, Clock, LogIn, Star,
  Flag, Trophy, Lightbulb,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatClock as formatTime } from "@/lib/format";

const SECONDS_PER_QUESTION = 60;


const QuizTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [quizNotFound, setQuizNotFound] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTakenFinal, setTimeTakenFinal] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [attemptSaved, setAttemptSaved] = useState(false);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from("quizzes").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { setQuizNotFound(true); return; }
      setQuiz(data);
    });
    (async () => {
      const data = await fetchQuizQuestions(id);
      setQuestions(data);
      setTimeLeft(data.length * SECONDS_PER_QUESTION);
    })();
  }, [id]);

  // Ratings
  const loadRatings = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("quiz_ratings").select("rating").eq("quiz_id", id);
    if (data && data.length > 0) {
      setTotalRatings(data.length);
      setAvgRating(data.reduce((sum, r) => sum + r.rating, 0) / data.length);
    }
    if (user) {
      const { data: mine } = await supabase.from("quiz_ratings").select("rating").eq("quiz_id", id).eq("user_id", user.id).maybeSingle();
      if (mine) { setUserRating(mine.rating); setRatingSaved(true); }
    }
  }, [id, user]);

  useEffect(() => { loadRatings(); }, [loadRatings]);

  const submitRating = async (rating: number) => {
    if (!user || !id) return;
    setUserRating(rating);
    const { error } = await supabase.from("quiz_ratings").upsert(
      { quiz_id: id, user_id: user.id, rating },
      { onConflict: "quiz_id,user_id" }
    );
    if (error) toast({ title: "Could not save rating", description: error.message, variant: "destructive" });
    else { setRatingSaved(true); loadRatings(); toast({ title: "Thanks for rating!" }); }
  };

  const saveAttempt = useCallback(async (finalScore: number, totalQ: number, timeTaken: number) => {
    if (!user || !id || attemptSaved) return;
    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: id, user_id: user.id, score: finalScore, total_questions: totalQ, time_taken_seconds: timeTaken,
    });
    if (error) toast({ title: "Could not save score", description: error.message, variant: "destructive" });
    else { setAttemptSaved(true); setLeaderboardKey(k => k + 1); }
  }, [user, id, attemptSaved]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    setConfirmOpen(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeTakenFinal(timeTaken);
    const finalScore = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
    saveAttempt(finalScore, questions.length, timeTaken);
    track(EVENTS.QUIZ_COMPLETE, {
      quiz: id, score: finalScore, total: questions.length, seconds: timeTaken,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [questions, answers, saveAttempt, id]);

  useEffect(() => {
    if (!started || submitted || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, submitted, questions.length, handleSubmit]);

  const totalTime = questions.length * SECONDS_PER_QUESTION;
  const progressPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
  const totalMarks = questions.reduce((acc, q) => acc + (q.marks ?? 1), 0);
  const marksObtained = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? (q.marks ?? 1) : 0), 0);
  const percent = questions.length ? Math.round((score / questions.length) * 100) : 0;

  const handleRetake = () => {
    setAnswers({}); setFlagged({}); setCurrent(0);
    setSubmitted(false); setStarted(false); setAttemptSaved(false);
    setTimeLeft(questions.length * SECONDS_PER_QUESTION);
  };

  const handleStart = () => {
    // Splitting the two outcomes is the whole point: quizzes demand a
    // sign-in before the first question, and the size of that wall's cost
    // has never been measured. A high signin_required-to-start ratio means
    // the gate is turning away engagement, not capturing leads.
    if (!user) {
      track(EVENTS.QUIZ_SIGNIN_REQUIRED, { quiz: id });
      navigate("/auth", { state: { from: `/quizzes/${id}` } });
      return;
    }
    track(EVENTS.QUIZ_START, { quiz: id });
    setStarted(true);
    startTimeRef.current = Date.now();
  };

  // Palette button style per question state.
  const paletteClass = (q: any, i: number) => {
    const isCurrent = i === current;
    const isAnswered = answers[q.id] !== undefined;
    const isFlagged = !!flagged[q.id];
    let base = "flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold transition-colors ";
    if (isCurrent) base += "ring-2 ring-accent ring-offset-1 ";
    if (isFlagged) return base + "bg-amber-100 text-amber-800 border border-amber-300";
    if (isAnswered) return base + "bg-emerald-100 text-emerald-800 border border-emerald-300";
    return base + "bg-muted text-muted-foreground border border-border hover:bg-slate-200";
  };

  if (quizNotFound) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="py-20 text-center">
        <p className="mb-4 text-muted-foreground">This quiz doesn't exist or may have been removed.</p>
        <Link to="/quizzes" className="text-sm font-semibold text-accent-deep hover:underline">
          <ArrowLeft className="mr-1 inline h-4 w-4" /> Back to Quizzes
        </Link>
      </div>
      <Footer />
    </div>
  );

  if (!quiz) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="py-20 text-center text-muted-foreground">Loading...</div>
      <Footer />
    </div>
  );

  const q = questions[current];
  const opts: string[] = q && Array.isArray(q.options) ? q.options : [];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={quiz.title}
        description={`Practice ${quiz.topic} with this topic-focused MCQ quiz — instant feedback on every answer.`}
        path={`/quizzes/${id}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Quiz",
          name: quiz.title,
          about: quiz.topic || quiz.title,
          description: quiz.description || `Topic-wise MCQ quiz on ${quiz.topic || quiz.title} for MBA, BBA and UGC NET/JRF preparation.`,
          educationalUse: "assessment",
          isAccessibleForFree: true,
          numberOfQuestions: questions.length || undefined,
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
        }}
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "MCQ Quizzes", to: "/quizzes" }, { label: quiz.title }]} />
        <Link to="/quizzes" className="mb-6 inline-flex items-center gap-1 text-sm text-accent-deep hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Quizzes
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-foreground sm:text-3xl">{quiz.title}</h1>
        <p className="mb-8 text-muted-foreground">{quiz.topic}</p>

        {questions.length === 0 ? (
          <p className="text-muted-foreground">No questions in this quiz yet.</p>
        ) : !started ? (
          /* ── Start screen ─────────────────────────────────────────────── */
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-accent-deep" />
            <h2 className="mb-2 text-xl font-bold text-foreground">Ready to begin?</h2>
            <p className="mb-1 text-muted-foreground">{questions.length} questions · {totalMarks} marks</p>
            <p className="mb-2 text-muted-foreground">
              Time limit: <span className="font-semibold text-foreground">{formatTime(totalTime)}</span>
            </p>
            {totalRatings > 0 && (
              <p className="mb-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-[#E34234] text-[#E34234]" />
                {avgRating.toFixed(1)}/5 ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
              </p>
            )}
            {totalRatings === 0 && <div className="mb-6" />}
            {!user && (
              <p className="mb-4 flex items-center justify-center gap-1 text-sm text-accent-deep">
                <LogIn className="h-4 w-4" /> You'll need to sign in to save your score
              </p>
            )}
            <button onClick={handleStart} className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground hover:brightness-110">
              {user ? "Start Quiz" : "Sign In & Start"}
            </button>
          </div>
        ) : !submitted ? (
          /* ── Exam mode: one question at a time + palette ──────────────── */
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div>
              {/* Timer bar */}
              <div className="sticky top-16 z-10 mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${timeLeft <= 30 ? "text-destructive animate-pulse" : "text-accent-deep"}`} />
                    <span className={`text-lg font-bold tabular-nums ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{answeredCount}/{questions.length} answered</span>
                </div>
                <Progress value={progressPercent} className={`h-2 ${timeLeft <= 30 ? "[&>div]:bg-destructive" : "[&>div]:bg-accent"}`} />
              </div>

              {/* Current question */}
              {q && (
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Question {current + 1} of {questions.length}
                      {q.difficulty && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px]">{q.difficulty}</span>}
                      <span className="ml-2 text-[11px]">{q.marks ?? 1} {(q.marks ?? 1) === 1 ? "mark" : "marks"}</span>
                    </p>
                    <button
                      onClick={() => setFlagged({ ...flagged, [q.id]: !flagged[q.id] })}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        flagged[q.id] ? "border-amber-300 bg-amber-50 text-amber-800" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                      aria-pressed={!!flagged[q.id]}
                    >
                      <Flag className="h-3.5 w-3.5" /> {flagged[q.id] ? "Flagged" : "Flag for review"}
                    </button>
                  </div>
                  <p className="mb-5 text-base font-semibold leading-relaxed text-foreground">{q.question}</p>
                  <div className="space-y-2">
                    {opts.map((opt, oi) => {
                      const selected = answers[q.id] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                          className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                            selected ? "border-accent bg-accent/10 text-foreground" : "border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="mr-2 font-bold text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>{opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Prev / Next */}
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setCurrent(c => Math.max(0, c - 1))}
                      disabled={current === 0}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </button>
                    {current < questions.length - 1 ? (
                      <button
                        onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110"
                      >
                        Next <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmOpen(true)}
                        className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110"
                      >
                        Submit Quiz
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Question palette */}
            <aside className="lg:sticky lg:top-16 lg:self-start">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question Palette</p>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
                  {questions.map((qq, i) => (
                    <button key={qq.id} onClick={() => setCurrent(i)} className={paletteClass(qq, i)} aria-label={`Go to question ${i + 1}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <p><span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-100 align-middle" /> Answered ({answeredCount})</p>
                  <p><span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-amber-300 bg-amber-100 align-middle" /> Flagged ({flaggedCount})</p>
                  <p><span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-border bg-muted align-middle" /> Not answered ({questions.length - answeredCount})</p>
                </div>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="mt-4 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110"
                >
                  Submit Quiz
                </button>
              </div>
            </aside>
          </div>
        ) : (
          /* ── Results + review ─────────────────────────────────────────── */
          <>
            <div className="mb-8 rounded-xl border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
                  <Trophy className="h-10 w-10 text-accent-deep" />
                </div>
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{score}/{questions.length}</p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{percent}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{marksObtained}/{totalMarks}</p>
                    <p className="text-xs text-muted-foreground">Marks</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatTime(timeTakenFinal)}</p>
                    <p className="text-xs text-muted-foreground">Time taken</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {timeLeft === 0 && <span className="text-xs font-medium text-destructive">Time's up — auto-submitted.</span>}
                <button onClick={handleRetake} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                  <RotateCcw className="h-4 w-4" /> Retake Quiz
                </button>
              </div>
            </div>

            <h2 className="mb-4 text-lg font-bold text-foreground">Review Answers</h2>
            <div className="space-y-6">
              {questions.map((rq, i) => {
                const ropts = Array.isArray(rq.options) ? (rq.options as string[]) : [];
                const userAnswer = answers[rq.id];
                const gotIt = userAnswer === rq.correct_answer;
                return (
                  <div key={rq.id} className={`rounded-lg border bg-card p-6 ${gotIt ? "border-emerald-200" : "border-red-200"}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="font-semibold text-foreground">{i + 1}. {rq.question}</p>
                      {gotIt
                        ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Correct</span>
                        : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><XCircle className="h-3.5 w-3.5" /> {userAnswer === undefined ? "Skipped" : "Wrong"}</span>}
                    </div>
                    <div className="space-y-2">
                      {ropts.map((opt, oi) => {
                        const selected = userAnswer === oi;
                        const isCorrect = oi === rq.correct_answer;
                        let classes = "w-full rounded-md border px-4 py-2.5 text-left text-sm ";
                        if (isCorrect) classes += "border-green-500 bg-green-50 text-green-800";
                        else if (selected) classes += "border-destructive bg-destructive/10 text-destructive";
                        else classes += "border-border text-muted-foreground";
                        return (
                          <div key={oi} className={classes}>
                            <span className="flex items-center gap-2">
                              {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {selected && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                              <span className="font-bold">{String.fromCharCode(65 + oi)}.</span> {opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {rq.explanation && (
                      <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-foreground dark:border-amber-800/40 dark:bg-amber-900/20">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <p className="mb-0.5 font-semibold text-amber-700 dark:text-amber-400">Explanation</p>
                          <p className="leading-relaxed text-foreground">{rq.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rating */}
            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Rate this Quiz</h3>
              <div className="mb-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => submitRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${(hoverRating || userRating) >= star ? "fill-[#E34234] text-[#E34234]" : "text-muted-foreground"}`} />
                  </button>
                ))}
                {userRating > 0 && <span className="ml-2 text-sm text-muted-foreground">{ratingSaved ? "Your rating saved!" : ""}</span>}
              </div>
              {totalRatings > 0 && (
                <p className="text-sm text-muted-foreground">
                  Average: <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>/5
                  <span className="ml-1">({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})</span>
                </p>
              )}
            </div>
          </>
        )}

        {/* Leaderboard always visible */}
        {id && <QuizLeaderboard key={leaderboardKey} quizId={id} />}
      </main>

      {/* Submit confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit quiz?</DialogTitle>
            <DialogDescription>
              You've answered {answeredCount} of {questions.length} questions
              {questions.length - answeredCount > 0 && <> — <strong>{questions.length - answeredCount} unanswered</strong></>}
              {flaggedCount > 0 && <>, {flaggedCount} flagged for review</>}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110">
              Yes, Submit
            </button>
            <button onClick={() => setConfirmOpen(false)} className="rounded-md border border-border px-5 py-2.5 text-sm text-muted-foreground hover:bg-muted">
              Keep Answering
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default QuizTake;
