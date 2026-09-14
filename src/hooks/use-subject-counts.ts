import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubjectCounts = {
  notes: Record<string, number>;
  quizzes: Record<string, number>;
  lectures: Record<string, number>;
  totalNotes: number;
};

const tally = (rows: any[] | null, keep?: (r: any) => boolean) => {
  const out: Record<string, number> = {};
  (rows ?? []).filter(r => !keep || keep(r)).forEach((r: any) => {
    const s = r.subject || "hrm";
    out[s] = (out[s] || 0) + 1;
  });
  return out;
};

// Per-subject inventory shown on every subject card (homepage, MBA/BBA hub).
// One query, cached app-wide, so the hero widget, the card grid and the hub
// can never disagree about how many notes a subject has.
export function useSubjectCounts() {
  const { data, isError } = useQuery({
    queryKey: ["subject-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubjectCounts> => {
      const [notesRes, quizRes, lectureRes] = await Promise.all([
        supabase.from("notes").select("subject"),
        (supabase.from("quizzes") as any).select("subject, published"),
        (supabase.from("lectures" as any) as any).select("subject"),
      ]);
      // Swallowing these reported every subject as having zero of
      // everything, which is indistinguishable from a site with no content.
      const failed = [notesRes, quizRes, lectureRes].find((r: any) => r.error);
      if (failed?.error) throw failed.error;
      const notes = notesRes.data;
      const quizzes = quizRes.data;
      const lectures = lectureRes.data;
      return {
        notes: tally(notes),
        quizzes: tally(quizzes, (q: any) => q.published !== false),
        lectures: tally(lectures),
        totalNotes: (notes ?? []).length,
      };
    },
  });
  // `loading: !data` on its own left a failed fetch stuck as "loading"
  // forever — spinners and "…" placeholders that never resolve.
  return { counts: data ?? null, loading: !data && !isError, failed: isError };
}
