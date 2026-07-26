-- Secure, view-only PYQ reading experience: previous year papers move from
-- "anyone can download the file" to "logged-in users can read it in the
-- in-browser viewer only". The pyq_papers *table* (title/year/tags) stays
-- publicly readable — that's just metadata and it's what keeps /pyqs
-- indexable by search engines — but the actual PDF bytes in the
-- pyq-papers storage bucket now require an authenticated session, so a
-- signed URL can no longer be minted anonymously.

DROP POLICY IF EXISTS "Anyone can read pyq files" ON storage.objects;
CREATE POLICY "Authenticated users can read pyq files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pyq-papers');

-- Per-user "where did I leave off" state for the PDF viewer.
CREATE TABLE public.pyq_reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pyq_id UUID NOT NULL REFERENCES public.pyq_papers(id) ON DELETE CASCADE,
  last_page INTEGER NOT NULL DEFAULT 1,
  total_pages INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, pyq_id)
);

ALTER TABLE public.pyq_reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pyq progress" ON public.pyq_reading_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pyq progress" ON public.pyq_reading_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pyq progress" ON public.pyq_reading_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_pyq_reading_progress_updated_at
  BEFORE UPDATE ON public.pyq_reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
