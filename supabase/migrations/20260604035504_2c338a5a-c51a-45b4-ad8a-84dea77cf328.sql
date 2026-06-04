CREATE TABLE public.live_lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  meeting_url text,
  platform text DEFAULT 'zoom',
  thumbnail_url text,
  subject text DEFAULT 'hrm',
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_lectures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_lectures TO authenticated;
GRANT ALL ON public.live_lectures TO service_role;

ALTER TABLE public.live_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live lectures" ON public.live_lectures FOR SELECT USING (true);
CREATE POLICY "Admin insert live lectures" ON public.live_lectures FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update live lectures" ON public.live_lectures FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete live lectures" ON public.live_lectures FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_live_lectures_updated_at
  BEFORE UPDATE ON public.live_lectures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();