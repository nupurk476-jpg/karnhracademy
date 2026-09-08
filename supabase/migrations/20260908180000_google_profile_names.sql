-- Take a real name from a Google sign-in.
--
-- The trigger only looked at raw_user_meta_data->>'display_name', which is
-- what our own sign-up form writes. Google supplies 'full_name' and
-- 'name', so without this every Google user would be named after the front
-- half of their email address -- and that string is what appears on the
-- quiz leaderboard.
--
-- NULLIF(btrim(...)) so a present-but-empty name loses to the next option
-- rather than winning with a blank.
--
-- The final literal fallback matters more than it looks: profiles
-- .display_name is NOT NULL and this trigger runs inside the transaction
-- that creates the user, so a row where every candidate is null does not
-- produce a nameless profile -- it aborts the whole sign-up with
-- "Database error saving new user". An identity provider that returns no
-- name and no email should cost us a generic label, not the account.
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
  RETURN NEW;
END;
$$;

-- Unchanged from the original grant; restated because CREATE OR REPLACE
-- resets nothing but it keeps the intent visible next to the definition.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
