
-- Blog posts
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'HRM Basics',
  author_name TEXT NOT NULL DEFAULT 'HR Research Hub',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Public insert for admin dev" ON public.blog_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for admin dev" ON public.blog_posts FOR UPDATE USING (true);
CREATE POLICY "Public delete for admin dev" ON public.blog_posts FOR DELETE USING (true);
CREATE POLICY "Admin can read all posts" ON public.blog_posts FOR SELECT USING (true);

-- Blog comments
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  content TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved comments" ON public.blog_comments FOR SELECT USING (approved = true);
CREATE POLICY "Anyone can post comments" ON public.blog_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public manage comments dev" ON public.blog_comments FOR UPDATE USING (true);
CREATE POLICY "Public delete comments dev" ON public.blog_comments FOR DELETE USING (true);
CREATE POLICY "Admin can read all comments" ON public.blog_comments FOR SELECT USING (true);

-- Notes
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Public manage notes dev" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notes dev" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Public delete notes dev" ON public.notes FOR DELETE USING (true);

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Public manage quizzes dev" ON public.quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update quizzes dev" ON public.quizzes FOR UPDATE USING (true);
CREATE POLICY "Public delete quizzes dev" ON public.quizzes FOR DELETE USING (true);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quiz questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Public manage quiz questions dev" ON public.quiz_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update quiz questions dev" ON public.quiz_questions FOR UPDATE USING (true);
CREATE POLICY "Public delete quiz questions dev" ON public.quiz_questions FOR DELETE USING (true);

-- Book recommendations
CREATE TABLE public.book_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  buy_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read books" ON public.book_recommendations FOR SELECT USING (true);
CREATE POLICY "Public manage books dev" ON public.book_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update books dev" ON public.book_recommendations FOR UPDATE USING (true);
CREATE POLICY "Public delete books dev" ON public.book_recommendations FOR DELETE USING (true);

-- Email subscribers
CREATE TABLE public.email_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public subscribe" ON public.email_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read subscribers dev" ON public.email_subscribers FOR SELECT USING (true);
CREATE POLICY "Admin delete subscribers dev" ON public.email_subscribers FOR DELETE USING (true);

-- Storage bucket for note PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', true);

CREATE POLICY "Anyone can read note files" ON storage.objects FOR SELECT USING (bucket_id = 'notes');
CREATE POLICY "Public upload note files dev" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes');
CREATE POLICY "Public delete note files dev" ON storage.objects FOR DELETE USING (bucket_id = 'notes');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
