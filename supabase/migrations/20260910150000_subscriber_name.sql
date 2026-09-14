-- Capture a first name alongside the address.
--
-- The welcome email opens with the subscriber's name, and until now there
-- was nothing to put there: this table held only an email, and neither the
-- newsletter forms nor the download gate asked for anything else. A
-- greeting that reads "Hi there" on every message is worse than no
-- greeting, so the field has to exist before the campaign can.
--
-- Nullable on purpose. It stays optional on the forms -- an extra required
-- field on a newsletter box costs sign-ups, and every address collected
-- before today has no name to backfill. The email template supplies a
-- fallback for exactly this case.
ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS name TEXT;

/*
 * subscribe_email gains an optional name.
 *
 * Kept as a DEFAULT NULL second parameter so the existing single-argument
 * signature keeps resolving: any caller not yet passing a name -- and any
 * cached client still sending the old shape -- continues to work rather
 * than failing at the RPC boundary.
 *
 * A name only ever fills a gap; it never overwrites one already stored.
 * Someone who subscribed with their name on the newsletter and later uses
 * the download gate without typing one should not silently lose it.
 */
CREATE OR REPLACE FUNCTION public.subscribe_email(_email TEXT, _name TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean TEXT := lower(btrim(coalesce(_email, '')));
  clean_name TEXT := nullif(btrim(coalesce(_name, '')), '');
BEGIN
  -- Deliberately loose: this rejects obvious junk, not unusual-but-valid
  -- addresses. Real validation is a delivered message.
  IF clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(clean) > 320 THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;

  -- Bounded because it goes into an email greeting: a pasted paragraph in
  -- the name box would arrive as the salutation of a real message.
  IF clean_name IS NOT NULL THEN
    clean_name := left(clean_name, 80);
  END IF;

  INSERT INTO public.email_subscribers (email, name)
  VALUES (clean, clean_name)
  ON CONFLICT (email) DO UPDATE
    SET
      -- Re-subscribing is an explicit act, so it revives a lapsed row.
      unsubscribed_at = NULL,
      name = COALESCE(public.email_subscribers.name, EXCLUDED.name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_email(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_email(TEXT, TEXT) TO anon, authenticated;
