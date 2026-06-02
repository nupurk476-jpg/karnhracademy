DROP POLICY IF EXISTS "Users can read own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Authenticated users can read quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can read own quiz ratings" ON public.quiz_ratings;
CREATE POLICY "Authenticated users can read quiz ratings"
ON public.quiz_ratings
FOR SELECT
TO authenticated
USING (true);