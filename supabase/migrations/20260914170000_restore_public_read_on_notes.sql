-- Restore anonymous read access to notes.
--
-- 20260217105426 created "Anyone can read notes" with no TO clause, so it
-- applied to PUBLIC and signed-out visitors could list notes. At some point
-- the policy was recreated scoped TO authenticated. The qual stayed `true`,
-- so pg_policies still reads as wide open and nothing errors -- PostgREST
-- just returns 200 with an empty array for the anon role. /notes rendered
-- its whole shell with zero notes and an empty console, and `select count(*)`
-- in the SQL editor kept reporting 220 because that session bypasses RLS.
--
-- Recreated explicitly TO anon, authenticated rather than relying on an
-- implicit PUBLIC default, so the intended audience is readable on sight and
-- a future recreate can't silently narrow it again.
DROP POLICY IF EXISTS "Anyone can read notes" ON public.notes;
CREATE POLICY "Anyone can read notes" ON public.notes
  FOR SELECT TO anon, authenticated USING (true);
