-- Automatic welcome email on account creation.
--
-- A row here means "this account is owed a welcome email"; sent_at means
-- it got one. Deliberately a queue rather than a direct send from the
-- trigger: Postgres should not be waiting on Brevo's HTTP response inside
-- the transaction that creates a user, and a failed send must be
-- retryable and visible instead of lost.
--
-- user_id as the primary key is the idempotency guarantee. Webhooks retry,
-- and a person can sign in any number of times; neither can produce a
-- second welcome.
CREATE TABLE IF NOT EXISTS public.welcome_emails (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  -- 'google' or 'email', straight from the identity provider, so it is
  -- possible to tell later which route a cohort of sign-ups came in by.
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- The sender's only query: what is still owed.
CREATE INDEX IF NOT EXISTS welcome_emails_pending_idx
  ON public.welcome_emails (created_at)
  WHERE sent_at IS NULL;

ALTER TABLE public.welcome_emails ENABLE ROW LEVEL SECURITY;

-- No policy for anon or authenticated on purpose. The only writer is the
-- trigger below (SECURITY DEFINER) and the only reader is the Edge
-- Function using the service role, which bypasses RLS. Admins can look.
CREATE POLICY "Admin read welcome emails" ON public.welcome_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/*
 * Enqueue on signup, from the trigger that already runs on auth.users.
 *
 * The exception block is the important part. This function runs inside
 * the transaction that creates the account, so anything that raises here
 * fails the sign-up itself -- the user would see "Database error saving
 * new user" because a marketing email could not be queued. A missed
 * welcome email is a small problem; a person unable to create an account
 * is not, so any failure is swallowed and merely warned about.
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(coalesce(NEW.email, ''), '@', 1), ''),
      'Student'
    )
  );

  BEGIN
    INSERT INTO public.welcome_emails (user_id, email, name, provider)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(btrim(NEW.raw_user_meta_data->>'display_name'), '')
      ),
      NEW.raw_app_meta_data->>'provider'
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'could not queue welcome email for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
