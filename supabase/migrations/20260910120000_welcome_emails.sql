-- Records who has already been sent a welcome email.
--
-- Google sign-in never produces a Supabase email: Google has verified the
-- address, so confirmation is skipped and the user lands in the app having
-- heard nothing. The welcome for those users is sent by an Edge Function
-- instead, and this table is what stops it going out again on every
-- subsequent sign-in.
--
-- The primary key IS the guard. The function inserts before it sends and
-- treats a conflict as "already welcomed", so two sign-ins racing each other
-- can still only produce one email.

CREATE TABLE public.welcome_emails (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- 'google', 'email', etc. Kept for working out who got what when something
  -- looks wrong months from now.
  provider TEXT
);

ALTER TABLE public.welcome_emails ENABLE ROW LEVEL SECURITY;

-- No policy for anon or authenticated: nobody reads or writes this from a
-- browser. The Edge Function uses the service role, which bypasses RLS.
-- Leaving the table with RLS on and no policies is the point — it is closed
-- by default rather than closed by an omission someone might "fix" later.

CREATE POLICY "Admin read welcome emails" ON public.welcome_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.welcome_emails TO authenticated;
GRANT ALL ON public.welcome_emails TO service_role;
