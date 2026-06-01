import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { HelpCircle, Users, Star } from "lucide-react";

const QuizList = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { attempts: number; users: number; avgScore: number }>>({});
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});

  useEffect(() => {
    const load = async () => {
      const { data: quizData } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
      if (quizData) setQuizzes(quizData);

      const { data: attempts } = await supabase.from("quiz_attempts").select("quiz_id, user_id, score, total_questions");
      if (attempts) {
        const s: Record<string, { attempts: number; users: Set<string>; totalPct: number }> = {};
        attempts.forEach((a) => {
          if (!s[a.quiz_id]) s[a.quiz_id] = { attempts: 0, users: new Set(), totalPct: 0 };
          s[a.quiz_id].attempts++;
          s[a.quiz_id].users.add(a.user_id);
          s[a.quiz_id].totalPct += a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0;
        });
        const mapped: Record<string, { attempts: number; users: number; avgScore: number }> = {};
        Object.entries(s).forEach(([id, v]) => {
          mapped[id] = { attempts: v.attempts, users: v.users.size, avgScore: v.attempts > 0 ? v.totalPct / v.attempts : 0 };
        });
        setStats(mapped);
      }

      const { data: ratingData } = await supabase.from("quiz_ratings").select("quiz_id, rating");
      if (ratingData) {
        const r: Record<string, { total: number; count: number }> = {};
        ratingData.forEach((rd) => {
          if (!r[rd.quiz_id]) r[rd.quiz_id] = { total: 0, count: 0 };
          r[rd.quiz_id].total += rd.rating;
          r[rd.quiz_id].count++;
        });
        const mapped: Record<string, { avg: number; count: number }> = {};
        Object.entries(r).forEach(([id, v]) => {
          mapped[id] = { avg: v.total / v.count, count: v.count };
        });
        setRatings(mapped);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Quizzes</h1>
        <p className="mb-10 text-muted-foreground">Test your knowledge with topic-based MCQ quizzes.</p>

        {quizzes.length === 0 ? (
          <p className="text-muted-foreground">No quizzes available yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const s = stats[quiz.id];
              const r = ratings[quiz.id];
              return (
                <Link key={quiz.id} to={`/quizzes/${quiz.id}`} className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
                  <HelpCircle className="mb-3 h-10 w-10 text-accent" />
                  <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-accent">{quiz.title}</h3>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{quiz.topic}</span>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {s ? `${s.users} ${s.users === 1 ? "person" : "people"}` : "0 people"}
                    </span>
                    {s && s.attempts > 0 && (
                      <span>
                        {s.attempts} {s.attempts === 1 ? "attempt" : "attempts"} · Avg {s.avgScore.toFixed(0)}%
                      </span>
                    )}
                    {r && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {r.avg.toFixed(1)} ({r.count})
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default QuizList;
