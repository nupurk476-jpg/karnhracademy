import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";

const SUBJECT = "lw";

// 5 minutes: content changes when the admin uploads something, which is
// rare relative to how often a student hops hub → unit → topic → back.
const STALE_MS = 5 * 60 * 1000;

// Shared by the Labour Welfare hub and every per-unit/topic subpage — all
// of them need the same four tables scoped to subject="lw". Served through
// React Query so navigating between those pages reuses the cached result
// instead of re-downloading everything on every hop (the provider was
// mounted app-wide for months with zero consumers).
export function useLabourWelfareContent() {
  const { data, isPending } = useQuery({
    queryKey: ["lw-content"],
    staleTime: STALE_MS,
    queryFn: async () => {
      const [{ data: noteData }, { data: quizData }, { data: pyqData }, { data: lectureData }] = await Promise.all([
        supabase.from("notes").select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("quizzes") as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("pyq_papers" as any) as any).select("*").eq("subject", SUBJECT).order("year", { ascending: false }),
        (supabase.from("lectures" as any) as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
      ]);
      const publishedQuizzes = (quizData ?? []).filter((q: any) => q.published !== false);

      // Question counts, paged — a naive .select() would silently truncate
      // once the combined question count across every LW quiz grows large.
      const questionCounts: Record<string, number> = {};
      if (publishedQuizzes.length > 0) {
        const quizIds = publishedQuizzes.map((q: any) => q.id);
        const questions = await fetchAllRows<{ quiz_id: string }>(() =>
          supabase.from("quiz_questions").select("quiz_id").in("quiz_id", quizIds)
        );
        questions.forEach((q) => { questionCounts[q.quiz_id] = (questionCounts[q.quiz_id] || 0) + 1; });
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
