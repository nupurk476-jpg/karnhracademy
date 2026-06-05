
-- 1) blog_comments: hide email from anon
REVOKE SELECT ON public.blog_comments FROM anon;
GRANT SELECT (id, blog_post_id, name, content, approved, created_at) ON public.blog_comments TO anon;

-- 2) profiles: restrict to owner; expose safe view
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow the view to see all rows by adding a permissive policy for safe cols via the view:
-- Since security_invoker=true respects RLS, add a policy granting SELECT on these rows to all authenticated.
-- We achieve safe exposure via column grants instead: revoke broad SELECT and grant only safe cols to authenticated.
-- But owners still need full SELECT — handled by the owner policy + full table grant to authenticated already exists.
-- To let the view return rows for other users, switch view to security definer-style by making it SECURITY DEFINER function-based:
DROP VIEW public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE (id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_user_ids)
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

-- 3) hr_resources: admin UPDATE policy
CREATE POLICY "Admin update hr resources"
  ON public.hr_resources FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) Storage UPDATE policies for admin
CREATE POLICY "Admins can update hr resource files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hr-resources' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'hr-resources' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update highlight images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'newspaper-highlights' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'newspaper-highlights' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update note files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'notes' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'notes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update quiz files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quiz-uploads' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'quiz-uploads' AND has_role(auth.uid(), 'admin'::app_role));
