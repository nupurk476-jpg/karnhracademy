-- Minimal stand-ins for the pieces Supabase provides, so the real
-- migration can run unmodified against a plain Postgres.
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE SCHEMA IF NOT EXISTS auth;

-- Test seam: whoever we pretend to be. Real Supabase reads this from the JWT.
CREATE TABLE auth._current (uid uuid);
INSERT INTO auth._current VALUES (NULL);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT uid FROM auth._current LIMIT 1 $$;

CREATE TABLE public.user_roles (user_id uuid, role public.app_role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Supabase's API roles.
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
