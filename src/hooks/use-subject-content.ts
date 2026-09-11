import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";

const STALE_MS = 5 * 60 * 1000;

// Every note, published MCQ set and lecture for one subject — the data a
// subject hub and its topic cards need. Cached per subject so hub → topic
// → hub navigation doesn't refetch.
export function useSubjectContent(subject: string) {
  const { data, isPending } = useQuery({
    queryKey: ["subject-content", subject],
    staleTime: STALE_MS,
    queryFn: async () => {
      const [{ data: noteData }, { data: quizData }, { data: lectureData }] = await Promise.all([
        // Legacy HRM notes were saved before the subject column existed.
        subject === "hrm"
          ? supabase.from("notes").select("*").or("subject.is.null,subject.eq.hrm").order("created_at", { ascending: false })
          : supabase.from("notes").select("*").eq("subject", subject).order("created_at", { ascending: false }),
        (supabase.from("quizzes") as any).select("*").eq("subject", subject).order("created_at", { ascending: false }),
        (supabase.from("lectures" as any) as any).select("*").eq("subject", subject).order("created_at", { ascending: false }),
      ]);
      const quizzes = (quizData ?? []).filter((q: any) => q.published !== false);

      const questionCounts: Record<string, number> = {};
      if (quizzes.length > 0) {
        const quizIds = quizzes.map((q: any) => q.id);
        const { data: counts, error } = await (supabase.rpc as any)("quiz_question_counts", { _quiz_ids: quizIds });
        if (!error && counts) {
          counts.forEach((c: any) => { questionCounts[c.quiz_id] = Number(c.question_count); });
        } else {
          const rows = await fetchAllRows<{ quiz_id: string }>(() =>
            supabase.from("quiz_questions").select("quiz_id").in("quiz_id", quizIds)
          );
          rows.forEach(r => { questionCounts[r.quiz_id] = (questionCounts[r.quiz_id] || 0) + 1; });
        }
      }

      return { notes: noteData ?? [], quizzes, questionCounts, lectures: lectureData ?? [] };
    },
  });

  return {
    notes: data?.notes ?? [],
    quizzes: data?.quizzes ?? [],
    questionCounts: data?.questionCounts ?? {},
    lectures: data?.lectures ?? [],
    loading: isPending,
  };
}
