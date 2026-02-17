import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle } from "lucide-react";

const QuizTake = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("quizzes").select("*").eq("id", id).single().then(({ data }) => setQuiz(data));
    supabase.from("quiz_questions").select("*").eq("quiz_id", id).order("created_at").then(({ data }) => data && setQuestions(data));
  }, [id]);

  const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
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
        ) : (
          <>
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
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-4">
              {!submitted ? (
                <button
                  onClick={() => setSubmitted(true)}
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
                  </div>
                  <button onClick={handleRetake} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
                    <RotateCcw className="h-4 w-4" /> Retake Quiz
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default QuizTake;
