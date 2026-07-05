-- Quizzes had no discipline/topic_slug column, so the public site had to
-- guess a quiz's subject from keyword-matching its free-text "topic" field.
-- Add real columns so Admin > Quizzes can align with the same discipline
-- taxonomy (src/lib/disciplines.ts) used by Notes.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS topic_slug TEXT;
