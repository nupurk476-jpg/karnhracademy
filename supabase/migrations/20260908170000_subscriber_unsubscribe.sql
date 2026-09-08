-- Unsubscribe, before the first campaign rather than after it.
--
-- Required under the DPDP Act (withdrawing consent must be as easy as
-- giving it) and required in practice: on a young sending domain, people
-- with no way out press "spam" instead, and a handful of complaints is
-- enough to put every later email in the junk folder.

-- Unguessable per-subscriber token. The address itself must never be the
-- key -- a link like ?email=someone@example.com lets anyone unsubscribe
-- anyone by editing the URL.
ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- NULL means subscribed. A timestamp records when they left, which is the
-- evidence you want if a complaint is ever raised. Deleting the row
-- instead would lose that, and would let the next form submission quietly
-- re-add them.
ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS email_subscribers_unsubscribe_token_idx
  ON public.email_subscribers (unsubscribe_token);

/*
 * Subscribing, server-side.
 *
 * The forms previously called upsert() from the browser. There is no
 * UPDATE policy on this table -- correctly, since one permissive enough
 * for an anonymous upsert would also let anyone rewrite anyone else's row
 * -- so the ON CONFLICT branch was rejected every time an address was
 * already present. Nothing checked the result, so the form said
 * "subscribed" either way. Harmless while the only outcome was a row that
 * already existed; not harmless now, because clearing unsubscribed_at is
 * exactly the update that was failing, and someone who left could never
 * come back.
 *
 * SECURITY DEFINER performs the write with the table owner's rights, so
 * the policy can stay closed while this one narrow, validated operation
 * gets through.
 */
CREATE OR REPLACE FUNCTION public.subscribe_email(_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean TEXT := lower(btrim(coalesce(_email, '')));
BEGIN
  -- Deliberately loose: this rejects obvious junk, not unusual-but-valid
  -- addresses. Real validation is a delivered message.
  IF clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(clean) > 320 THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;

  INSERT INTO public.email_subscribers (email)
  VALUES (clean)
  ON CONFLICT (email) DO UPDATE
    -- Re-subscribing is an explicit act, so it revives a lapsed row.
    SET unsubscribed_at = NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_email(TEXT) TO anon, authenticated;

/*
 * Unsubscribing by token.
 *
 * Callable anonymously, because a recipient has no account and must not
 * need one. The token is the whole authorisation: 122 bits of random,
 * so it cannot be guessed, and it grants nothing except leaving this one
 * list.
 *
 * Idempotent -- clicking twice is a success, not an error. Returns the
 * address so the page can confirm which one was removed, which is the
 * difference between a page that reassures and one that leaves the reader
 * wondering whether it worked.
 */
CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_email TEXT;
BEGIN
  UPDATE public.email_subscribers
    SET unsubscribed_at = coalesce(unsubscribed_at, now())
    WHERE unsubscribe_token = _token
    RETURNING email INTO row_email;

  IF row_email IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  RETURN jsonb_build_object('ok', true, 'email', row_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unsubscribe_by_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(UUID) TO anon, authenticated;
