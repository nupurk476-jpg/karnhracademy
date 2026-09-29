-- Emails given at the download gate, kept apart from the newsletter list.
--
-- The gate used to call subscribe_email, which put every address straight
-- onto email_subscribers -- the list campaigns are sent to. The gate now
-- asks separately ("Send me new notes and exam updates", unticked by
-- default), and only a ticked box may add someone to that list. An
-- address given just to get a PDF is recorded here instead, which is also
-- the consent record: newsletter_opt_in says what the person chose at the
-- moment they chose it.
--
-- One row per submission, not per address: the same person on a second
-- device, or changing their mind about the newsletter, is its own event.
CREATE TABLE public.download_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT false,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX download_emails_created_idx ON public.download_emails (created_at DESC);
CREATE INDEX download_emails_email_idx ON public.download_emails (email);

ALTER TABLE public.download_emails ENABLE ROW LEVEL SECURITY;

-- No insert policy: the only writer is the function below. Admins read
-- and can delete (a deletion request covers this table too).
CREATE POLICY "Admin read download emails" ON public.download_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete download emails" ON public.download_emails
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/*
 * The gate's single write. Raises on an invalid address, which the client
 * relies on: the gate only records email_given, saves the "already gave
 * an email" flag and starts the download after this has succeeded.
 *
 * The newsletter branch goes through subscribe_email rather than
 * duplicating it, so re-subscribing a lapsed address and keeping an
 * existing name behave exactly as they do for the home-page form. It runs
 * in the same transaction, so a ticked box can never record a download
 * without also recording the subscription, or the other way round.
 */
CREATE OR REPLACE FUNCTION public.capture_download_email(
  _email TEXT,
  _newsletter BOOLEAN DEFAULT false,
  _path TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean TEXT := lower(btrim(coalesce(_email, '')));
BEGIN
  -- Same deliberately loose check as subscribe_email.
  IF clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(clean) > 320 THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;

  INSERT INTO public.download_emails (email, newsletter_opt_in, path)
  VALUES (clean, coalesce(_newsletter, false), left(_path, 500));

  IF coalesce(_newsletter, false) THEN
    PERFORM public.subscribe_email(clean, NULL);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.capture_download_email(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_download_email(TEXT, BOOLEAN, TEXT) TO anon, authenticated;
