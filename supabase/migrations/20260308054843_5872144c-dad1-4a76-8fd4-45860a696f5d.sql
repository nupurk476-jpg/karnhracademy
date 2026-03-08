CREATE TABLE public.quiz_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, user_id)
);

ALTER TABLE public.quiz_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz ratings"
  ON public.quiz_ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own rating"
  ON public.quiz_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rating"
  ON public.quiz_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);