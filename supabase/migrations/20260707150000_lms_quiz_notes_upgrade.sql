-- LMS upgrade: quiz publishing/metadata, question ordering & scoring fields,
-- and note view/size tracking. All columns have backward-compatible defaults
-- so existing rows and older clients keep working unchanged.

-- Quizzes: publish workflow + optional description shown on quiz cards.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS description TEXT;

-- Quiz questions: explicit ordering (position), difficulty and marks.
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS position INTEGER;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS marks INTEGER NOT NULL DEFAULT 1;

-- Backfill position from creation order so existing questions keep their order.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY quiz_id ORDER BY created_at) AS rn
  FROM public.quiz_questions
)
UPDATE public.quiz_questions q
SET position = ordered.rn
FROM ordered
WHERE q.id = ordered.id AND q.position IS NULL;

-- Notes: file size (recorded at upload) and view counter.
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Anonymous visitors can't UPDATE notes (admin-only policy), so view counting
-- goes through a narrow SECURITY DEFINER function that can only increment.
CREATE OR REPLACE FUNCTION public.increment_note_views(_note_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notes SET view_count = view_count + 1 WHERE id = _note_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_note_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_note_views(uuid) TO anon, authenticated;
