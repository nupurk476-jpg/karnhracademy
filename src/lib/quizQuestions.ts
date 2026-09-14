import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

// Every place that loads a single quiz's full question set (taking the
// quiz, editing it, duplicating it, previewing it) shared the same two
// quirks: ordering by `position` fails outright until that column's
// migration has run, and a large "complete question bank" quiz can exceed
// Supabase's default per-request row cap — so this pages through with
// .range() instead of trusting a single .select() to return every row.
// Throws on a genuine fetch failure so callers can still surface it.
// Deliberately not "*". The database revokes column access to
// correct_answer and explanation from anon/authenticated (see the
// server_side_quiz_grading migration), so selecting them here would fail
// outright — and that is the point: the answer key used to be sitting in
// the page before the student answered anything. Grading happens in
// submit_quiz_attempt now, which returns the key only once the attempt is
// recorded. `position` is omitted too: only the ordering below needs it,
// and the admin path reads whole rows through its own RPC.
const STUDENT_COLUMNS = "id, quiz_id, question, options, difficulty, marks, created_at";

export async function fetchQuizQuestions(quizId: string): Promise<any[]> {
  const byPosition = () =>
    supabase.from("quiz_questions").select(STUDENT_COLUMNS).eq("quiz_id", quizId)
      .order("position" as any, { ascending: true, nullsFirst: false }).order("created_at");
  const byCreatedAt = () =>
    supabase.from("quiz_questions").select(STUDENT_COLUMNS).eq("quiz_id", quizId).order("created_at");

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

// The admin editor has to show and edit correct_answer, and the column
// grant above took that away from `authenticated` — which is the admin's
// role too. This RPC is SECURITY DEFINER and returns rows only when
// has_role(admin) holds, so the check lives in the database rather than in
// whichever screen happens to call it.
export async function fetchQuizQuestionsAdmin(quizId: string): Promise<any[]> {
  const { data, error } = await (supabase.rpc as any)("get_quiz_questions_admin", { _quiz_id: quizId });
  if (error) throw new Error(error.message);
  return data ?? [];
}
