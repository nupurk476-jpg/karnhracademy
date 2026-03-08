import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuizLeaderboard from "@/components/QuizLeaderboard";
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Clock, LogIn, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const SECONDS_PER_QUESTION = 60;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const QuizTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
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
    supabase.from("quizzes").select("*").eq("id", id).single().then(({ data }) => setQuiz(data));
    supabase.from("quiz_questions").select("*").eq("quiz_id", id).order("created_at").then(({ data }) => {
      if (data) {
        setQuestions(data);
        setTimeLeft(data.length * SECONDS_PER_QUESTION);
      }
    });
  }, [id]);

  // Load ratings
  const loadRatings = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("quiz_ratings").select("rating").eq("quiz_id", id);
    if (data && data.length > 0) {
      setTotalRatings(data.length);
      setAvgRating(data.reduce((sum, r) => sum + r.rating, 0) / data.length);
    }
    if (user) {
      const { data: mine } = await supabase.from("quiz_ratings").select("rating").eq("quiz_id", id).eq("user_id", user.id).maybeSingle();
      if (mine) {
        setUserRating(mine.rating);
        setRatingSaved(true);
      }
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
    if (error) {
      toast({ title: "Could not save rating", description: error.message, variant: "destructive" });
    } else {
      setRatingSaved(true);
      loadRatings();
      toast({ title: "Thanks for rating!" });
    }
  };

  const saveAttempt = useCallback(async (finalScore: number, totalQ: number, timeTaken: number) => {
    if (!user || !id || attemptSaved) return;
    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: id,
      user_id: user.id,
      score: finalScore,
      total_questions: totalQ,
      time_taken_seconds: timeTaken,
    });
    if (error) {
      toast({ title: "Could not save score", description: error.message, variant: "destructive" });
    } else {
      setAttemptSaved(true);
      setLeaderboardKey(k => k + 1);
    }
  }, [user, id, attemptSaved]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const finalScore = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
    saveAttempt(finalScore, questions.length, timeTaken);
  }, [questions, answers, saveAttempt]);

  useEffect(() => {
    if (!started || submitted || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, submitted, questions.length, handleSubmit]);

  const totalTime = questions.length * SECONDS_PER_QUESTION;
  const progressPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setStarted(false);
    setAttemptSaved(false);
    setTimeLeft(questions.length * SECONDS_PER_QUESTION);
  };

  const handleStart = () => {
    if (!user) {
      navigate("/auth", { state: { from: `/quizzes/${id}` } });
      return;
    }
    setStarted(true);
    startTimeRef.current = Date.now();
  };

  if (!quiz) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="py-20 text-center text-muted-foreground">Loading...</div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/quizzes" className="mb-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Quizzes
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-foreground">{quiz.title}</h1>
        <p className="mb-8 text-muted-foreground">{quiz.topic}</p>

        {questions.length === 0 ? (
          <p className="text-muted-foreground">No questions in this quiz yet.</p>
        ) : !started ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-accent" />
            <h2 className="mb-2 text-xl font-bold text-foreground">Ready to begin?</h2>
            <p className="mb-1 text-muted-foreground">{questions.length} questions</p>
            <p className="mb-6 text-muted-foreground">
              Time limit: <span className="font-semibold text-foreground">{formatTime(totalTime)}</span>
            </p>
            {!user && (
              <p className="mb-4 flex items-center justify-center gap-1 text-sm text-accent">
                <LogIn className="h-4 w-4" /> You'll need to sign in to save your score
              </p>
            )}
            <button
              onClick={handleStart}
              className="rounded-md bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground hover:brightness-110"
            >
              {user ? "Start Quiz" : "Sign In & Start"}
            </button>
          </div>
        ) : (
          <>
            {!submitted && (
              <div className="sticky top-0 z-10 mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${timeLeft <= 30 ? "text-destructive animate-pulse" : "text-accent"}`} />
                    <span className={`text-lg font-bold tabular-nums ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Object.keys(answers).length}/{questions.length} answered
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className={`h-2 ${timeLeft <= 30 ? "[&>div]:bg-destructive" : "[&>div]:bg-accent"}`}
                />
              </div>
            )}

            <div className="space-y-8">
              {questions.map((q, i) => {
                const opts = Array.isArray(q.options) ? q.options as string[] : [];
                return (
                  <div key={q.id} className="rounded-lg border border-border bg-card p-6">
                    <p className="mb-4 font-semibold text-foreground">
                      {i + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {opts.map((opt, oi) => {
                        const selected = answers[q.id] === oi;
                        const isCorrect = oi === q.correct_answer;
                        let classes = "w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ";
                        if (submitted) {
                          if (isCorrect) classes += "border-green-500 bg-green-50 text-green-800 ";
                          else if (selected && !isCorrect) classes += "border-destructive bg-destructive/10 text-destructive ";
                          else classes += "border-border text-muted-foreground ";
                        } else {
                          classes += selected ? "border-accent bg-accent/10 text-foreground " : "border-border text-foreground hover:bg-muted ";
                        }
                        return (
                          <button
                            key={oi}
                            onClick={() => !submitted && setAnswers({ ...answers, [q.id]: oi })}
                            className={classes}
                            disabled={submitted}
                          >
                            <span className="flex items-center gap-2">
                              {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {submitted && selected && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {submitted && q.explanation && (
                      <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-foreground">
                        <span className="font-semibold text-accent">Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-4">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length < questions.length}
                  className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
                >
                  Submit Quiz
                </button>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-card px-6 py-4">
                    <span className="text-2xl font-bold text-foreground">{score}/{questions.length}</span>
                    <span className="ml-2 text-sm text-muted-foreground">correct</span>
                    {timeLeft === 0 && (
                      <span className="ml-3 text-xs text-destructive font-medium">Time's up!</span>
                    )}
                  </div>
                  <button onClick={handleRetake} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
                    <RotateCcw className="h-4 w-4" /> Retake Quiz
                  </button>
                </>
              )}
            </div>

            {/* Rating section after submission */}
            {submitted && (
              <div className="mt-6 rounded-lg border border-border bg-card p-6">
                <h3 className="mb-3 text-lg font-semibold text-foreground">Rate this Quiz</h3>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => submitRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          (hoverRating || userRating) >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {ratingSaved ? "Your rating saved!" : ""}
                    </span>
                  )}
                </div>
                {totalRatings > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Average: <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>/5
                    <span className="ml-1">({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})</span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Leaderboard always visible */}
        {id && <QuizLeaderboard key={leaderboardKey} quizId={id} />}
      </main>
      <Footer />
    </div>
  );
};

export default QuizTake;
