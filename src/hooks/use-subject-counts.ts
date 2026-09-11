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
  const { data } = useQuery({
    queryKey: ["subject-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubjectCounts> => {
      const [{ data: notes }, { data: quizzes }, { data: lectures }] = await Promise.all([
        supabase.from("notes").select("subject"),
        (supabase.from("quizzes") as any).select("subject, published"),
        (supabase.from("lectures" as any) as any).select("subject"),
      ]);
      return {
        notes: tally(notes),
        quizzes: tally(quizzes, (q: any) => q.published !== false),
        lectures: tally(lectures),
        totalNotes: (notes ?? []).length,
      };
    },
  });
  return { counts: data ?? null, loading: !data };
}
