import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";

const SUBJECT = "mba-eco";
const STALE_MS = 5 * 60 * 1000;

export function useMBAEconomicsContent() {
  const { data, isPending } = useQuery({
    queryKey: ["mba-eco-content"],
    staleTime: STALE_MS,
    queryFn: async () => {
      const [{ data: noteData }, { data: quizData }, { data: pyqData }, { data: lectureData }] = await Promise.all([
        supabase.from("notes").select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("quizzes") as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("pyq_papers" as any) as any).select("*").eq("subject", SUBJECT).order("year", { ascending: false }),
        (supabase.from("lectures" as any) as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
      ]);
      const publishedQuizzes = (quizData ?? []).filter((q: any) => q.published !== false);

      const questionCounts: Record<string, number> = {};
      if (publishedQuizzes.length > 0) {
        const quizIds = publishedQuizzes.map((q: any) => q.id);
        const { data: counts, error } = await (supabase.rpc as any)("quiz_question_counts", { _quiz_ids: quizIds });
        if (!error && counts) {
          counts.forEach((c: any) => { questionCounts[c.quiz_id] = Number(c.question_count); });
        } else {
          const questions = await fetchAllRows<{ quiz_id: string }>(() =>
            supabase.from("quiz_questions").select("quiz_id").in("quiz_id", quizIds)
          );
          questions.forEach((q) => { questionCounts[q.quiz_id] = (questionCounts[q.quiz_id] || 0) + 1; });
        }
      }

      return {
        notes: noteData ?? [],
        quizzes: publishedQuizzes,
        questionCounts,
        pyqs: pyqData ?? [],
        lectures: lectureData ?? [],
      };
    },
  });

  return {
    notes: data?.notes ?? [],
    quizzes: data?.quizzes ?? [],
    questionCounts: data?.questionCounts ?? {},
    pyqs: data?.pyqs ?? [],
    lectures: data?.lectures ?? [],
    loading: isPending,
  };
}
