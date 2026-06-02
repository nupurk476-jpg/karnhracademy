DROP POLICY IF EXISTS "Authenticated users can read quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can read own quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Authenticated users can read quiz ratings" ON public.quiz_ratings;
CREATE POLICY "Users can read own quiz ratings"
ON public.quiz_ratings
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);