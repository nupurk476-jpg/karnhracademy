-- Grade quizzes on the server, and stop shipping the answer key.
--
-- Two separate holes, both in the same flow:
--
-- 1. quiz_questions was readable in full by anyone, correct_answer
--    included, because grading happened in the browser. The answer key was
--    in the page before the student answered anything.
--
-- 2. quiz_attempts accepted whatever score the browser claimed. Its INSERT
--    policy checked auth.uid() = user_id and nothing else, so any signed-in
--    user could post 20/20 without opening a question. The leaderboard was
--    decorative.
--
-- Fixing (2) alone would be pointless while (1) stands, and fixing (1)
-- alone impossible while the browser needs the key to grade. So: the
-- browser now submits answers, the database grades them and records the
-- result itself, and the key never leaves the server until after submission.

-- ── 1. Grade + record, in one place the client cannot skip ──────────────
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _quiz_id uuid,
  _answers jsonb,                      -- { "<question id>": <option index> }
  _time_taken_seconds integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _score int := 0;
  _total int := 0;
  _marks_total int := 0;
  _marks_obtained int := 0;
  _review jsonb := '[]'::jsonb;
  _given int;
  r record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'must be signed in to submit an attempt';
  END IF;

  -- Drafts are admin-only everywhere else; don't let one be attempted.
  IF NOT EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = _quiz_id AND q.published IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'quiz not found';
  END IF;

  FOR r IN
    SELECT id, correct_answer, explanation, coalesce(marks, 1) AS marks
    FROM public.quiz_questions
    WHERE quiz_id = _quiz_id
  LOOP
    _total := _total + 1;
    _marks_total := _marks_total + r.marks;

    -- A missing, null or non-numeric answer is simply wrong, never an error:
    -- an unanswered question is a normal way to finish a quiz.
    BEGIN
      _given := nullif(_answers ->> r.id::text, '')::int;
    EXCEPTION WHEN others THEN
      _given := NULL;
    END;

    IF _given IS NOT NULL AND _given = r.correct_answer THEN
      _score := _score + 1;
      _marks_obtained := _marks_obtained + r.marks;
    END IF;

    -- Returned only now, with the attempt already recorded, so the review
    -- screen can still show what was right and why.
    _review := _review || jsonb_build_object(
      'id', r.id, 'correct_answer', r.correct_answer, 'explanation', r.explanation
    );
  END LOOP;

  IF _total = 0 THEN
    RAISE EXCEPTION 'quiz has no questions';
  END IF;

  INSERT INTO public.quiz_attempts (quiz_id, user_id, score, total_questions, time_taken_seconds)
  VALUES (_quiz_id, _uid, _score, _total, greatest(0, coalesce(_time_taken_seconds, 0)));

  RETURN jsonb_build_object(
    'score', _score,
    'total_questions', _total,
    'marks_obtained', _marks_obtained,
    'total_marks', _marks_total,
    'review', _review
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, integer) TO authenticated;

-- ── 2. Close the direct write path ──────────────────────────────────────
-- Without this the RPC is just a politer way in: the browser could still
-- insert its own score. Scores now have exactly one origin.
DROP POLICY IF EXISTS "Authenticated users can insert own attempts" ON public.quiz_attempts;
REVOKE INSERT ON public.quiz_attempts FROM anon, authenticated;

-- ── 3. Stop serving the answer key to students ──────────────────────────
-- Column-level, because RLS is row-level and cannot hide a column. Reads of
-- everything except correct_answer/explanation are unaffected.
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;
GRANT SELECT (id, quiz_id, question, options, position, difficulty, marks, created_at)
  ON public.quiz_questions TO anon, authenticated;

-- ── 4. Give the admin editor its full read back ─────────────────────────
-- AdminQuizzes has to show and edit correct_answer, and the grant above
-- took that away from `authenticated` — which is the admin's role too.
CREATE OR REPLACE FUNCTION public.get_quiz_questions_admin(_quiz_id uuid)
RETURNS SETOF public.quiz_questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.quiz_questions
  WHERE quiz_id = _quiz_id
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY position NULLS LAST, created_at;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_admin(uuid) TO authenticated;
