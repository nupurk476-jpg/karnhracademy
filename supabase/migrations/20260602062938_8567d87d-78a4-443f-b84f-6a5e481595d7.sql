
-- 1. Profiles: restrict reads to authenticated users (phone, location, bio are sensitive)
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Quiz attempts: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can read quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Authenticated users can read quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (true);

-- 3. Quiz ratings: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can read quiz ratings" ON public.quiz_ratings;
CREATE POLICY "Authenticated users can read quiz ratings"
ON public.quiz_ratings
FOR SELECT
TO authenticated
USING (true);

-- 4. Lock down SECURITY DEFINER functions: revoke from public/anon, keep only what's needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
