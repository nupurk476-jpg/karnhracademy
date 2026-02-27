
-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: only admins can read, no public access
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Now replace dev RLS policies on all admin-managed tables

-- blog_posts: replace dev write policies
DROP POLICY IF EXISTS "Public insert for admin dev" ON public.blog_posts;
DROP POLICY IF EXISTS "Public update for admin dev" ON public.blog_posts;
DROP POLICY IF EXISTS "Public delete for admin dev" ON public.blog_posts;

CREATE POLICY "Admin insert blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete blog posts" ON public.blog_posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- blog_comments: replace dev write policies
DROP POLICY IF EXISTS "Public manage comments dev" ON public.blog_comments;
DROP POLICY IF EXISTS "Public delete comments dev" ON public.blog_comments;

CREATE POLICY "Admin update comments" ON public.blog_comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete comments" ON public.blog_comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notes
DROP POLICY IF EXISTS "Public manage notes dev" ON public.notes;
DROP POLICY IF EXISTS "Public delete notes dev" ON public.notes;
DROP POLICY IF EXISTS "Public update notes dev" ON public.notes;

CREATE POLICY "Admin insert notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update notes" ON public.notes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete notes" ON public.notes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- quizzes
DROP POLICY IF EXISTS "Public manage quizzes dev" ON public.quizzes;
DROP POLICY IF EXISTS "Public delete quizzes dev" ON public.quizzes;
DROP POLICY IF EXISTS "Public update quizzes dev" ON public.quizzes;

CREATE POLICY "Admin insert quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete quizzes" ON public.quizzes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- quiz_questions
DROP POLICY IF EXISTS "Public manage quiz questions dev" ON public.quiz_questions;
DROP POLICY IF EXISTS "Public delete quiz questions dev" ON public.quiz_questions;
DROP POLICY IF EXISTS "Public update quiz questions dev" ON public.quiz_questions;

CREATE POLICY "Admin insert quiz questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update quiz questions" ON public.quiz_questions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete quiz questions" ON public.quiz_questions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- book_recommendations
DROP POLICY IF EXISTS "Public manage books dev" ON public.book_recommendations;
DROP POLICY IF EXISTS "Public delete books dev" ON public.book_recommendations;
DROP POLICY IF EXISTS "Public update books dev" ON public.book_recommendations;

CREATE POLICY "Admin insert books" ON public.book_recommendations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update books" ON public.book_recommendations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete books" ON public.book_recommendations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- newspaper_highlights
DROP POLICY IF EXISTS "Public insert highlights dev" ON public.newspaper_highlights;
DROP POLICY IF EXISTS "Public update highlights dev" ON public.newspaper_highlights;
DROP POLICY IF EXISTS "Public delete highlights dev" ON public.newspaper_highlights;

CREATE POLICY "Admin insert highlights" ON public.newspaper_highlights FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update highlights" ON public.newspaper_highlights FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete highlights" ON public.newspaper_highlights FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- email_subscribers: replace dev policies
DROP POLICY IF EXISTS "Admin read subscribers dev" ON public.email_subscribers;
DROP POLICY IF EXISTS "Admin delete subscribers dev" ON public.email_subscribers;

CREATE POLICY "Admin read subscribers" ON public.email_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete subscribers" ON public.email_subscribers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Also replace the overly broad admin select on blog_posts and blog_comments
DROP POLICY IF EXISTS "Admin can read all posts" ON public.blog_posts;
CREATE POLICY "Admin can read all posts" ON public.blog_posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can read all comments" ON public.blog_comments;
CREATE POLICY "Admin can read all comments" ON public.blog_comments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
