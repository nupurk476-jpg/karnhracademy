-- No-op probe: verifies the GitHub -> Supabase integration applies
-- migrations on merge. If version 20260707160000 appears in the
-- project's migration history, the integration is working.
SELECT 1;
