import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HelpCircle } from "lucide-react";

const QuizList = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("quizzes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setQuizzes(data));
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
            {quizzes.map((quiz) => (
              <Link key={quiz.id} to={`/quizzes/${quiz.id}`} className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
                <HelpCircle className="mb-3 h-10 w-10 text-accent" />
                <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-accent">{quiz.title}</h3>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{quiz.topic}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default QuizList;
