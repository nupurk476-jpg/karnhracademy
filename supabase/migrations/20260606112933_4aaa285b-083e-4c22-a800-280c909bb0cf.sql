
-- ============ Fix 1: blog_comments email exposure ============
-- Revoke SELECT on email column from anon and authenticated so it can never
-- leak via the public-approved-comments policy or general authenticated reads.
REVOKE SELECT (email) ON public.blog_comments FROM anon;
REVOKE SELECT (email) ON public.blog_comments FROM authenticated;
-- service_role retains full access for edge functions / admin tooling.

-- Admin RPC to fetch comments WITH email (admin-only check inside).
CREATE OR REPLACE FUNCTION public.get_admin_blog_comments()
RETURNS TABLE (
  id uuid,
  blog_post_id uuid,
  name text,
  email text,
  content text,
  approved boolean,
  created_at timestamptz,
  blog_post_title text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT c.id, c.blog_post_id, c.name, c.email, c.content, c.approved, c.created_at,
         bp.title AS blog_post_title
  FROM public.blog_comments c
  LEFT JOIN public.blog_posts bp ON bp.id = c.blog_post_id
  ORDER BY c.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_blog_comments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_blog_comments() TO authenticated;

-- ============ Fix 2: quiz_attempts cross-user readability ============
DROP POLICY IF EXISTS "Authenticated users can read quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Users can read own quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Leaderboard RPC: returns aggregated best attempt per user for a quiz, with display names.
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(_quiz_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  score integer,
  total_questions integer,
  time_taken_seconds integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH best AS (
    SELECT DISTINCT ON (qa.user_id)
      qa.user_id, qa.score, qa.total_questions, qa.time_taken_seconds, qa.created_at
    FROM public.quiz_attempts qa
    WHERE qa.quiz_id = _quiz_id
    ORDER BY qa.user_id, qa.score DESC, qa.time_taken_seconds ASC
  )
  SELECT b.user_id,
         COALESCE(p.display_name, 'Anonymous') AS display_name,
         b.score, b.total_questions, b.time_taken_seconds, b.created_at
  FROM best b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  ORDER BY b.score DESC, b.time_taken_seconds ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_quiz_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_leaderboard(uuid) TO authenticated;
