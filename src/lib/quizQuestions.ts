import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

// Every place that loads a single quiz's full question set (taking the
// quiz, editing it, duplicating it, previewing it) shared the same two
// quirks: ordering by `position` fails outright until that column's
// migration has run, and a large "complete question bank" quiz can exceed
// Supabase's default per-request row cap — so this pages through with
// .range() instead of trusting a single .select() to return every row.
// Throws on a genuine fetch failure so callers can still surface it.
export async function fetchQuizQuestions(quizId: string): Promise<any[]> {
  const byPosition = () =>
    supabase.from("quiz_questions").select("*").eq("quiz_id", quizId)
      .order("position" as any, { ascending: true, nullsFirst: false }).order("created_at");
  const byCreatedAt = () =>
    supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("created_at");

  const probe = await byPosition().range(0, 0);
  const build = probe.error ? byCreatedAt : byPosition;

  const rows: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}
