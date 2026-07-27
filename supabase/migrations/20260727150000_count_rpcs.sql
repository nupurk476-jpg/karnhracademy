-- Server-side counts (audit items P-02/P-03).
--
-- 1. quiz_question_counts: the client previously downloaded every
--    quiz_questions row (paged!) just to count questions per quiz —
--    payload grows linearly with the question bank. SECURITY INVOKER
--    (the default) keeps RLS in force, so the counts can only see what
--    the caller could read anyway.
CREATE OR REPLACE FUNCTION public.quiz_question_counts(_quiz_ids uuid[])
RETURNS TABLE (quiz_id uuid, question_count bigint)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT quiz_id, count(*)
  FROM public.quiz_questions
  WHERE quiz_id = ANY(_quiz_ids)
  GROUP BY quiz_id;
$$;

REVOKE EXECUTE ON FUNCTION public.quiz_question_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quiz_question_counts(uuid[]) TO anon, authenticated;

-- 2. homepage_counts: the homepage fires ~10 independent HEAD count
--    queries on load (hero subject counts, audience-split stats, founder
--    stats). One round-trip returns them all; the frontend adopts this
--    incrementally and falls back to individual queries when absent.
CREATE OR REPLACE FUNCTION public.homepage_counts()
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'notes_total',      (SELECT count(*) FROM public.notes),
    'notes_by_subject', (SELECT coalesce(jsonb_object_agg(coalesce(subject, 'hrm'), n), '{}'::jsonb)
                           FROM (SELECT subject, count(*) AS n FROM public.notes GROUP BY subject) t),
    'quizzes_total',    (SELECT count(*) FROM public.quizzes WHERE published IS DISTINCT FROM false),
    'quizzes_lw',       (SELECT count(*) FROM public.quizzes WHERE subject = 'lw' AND published IS DISTINCT FROM false),
    'pyqs_lw',          (SELECT count(*) FROM public.pyq_papers WHERE subject = 'lw'),
    'lectures_total',   (SELECT count(*) FROM public.lectures),
    'books_total',      (SELECT count(*) FROM public.book_recommendations)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.homepage_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.homepage_counts() TO anon, authenticated;
