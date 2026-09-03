-- Try to break the registration security model the way a stranger with a
-- REST client would. Every one of these SHOULD be refused, except the
-- happy path and the seat-count read.
\set ON_ERROR_STOP off
\pset pager off

-- Set up: one ₹1,500 programme, one open batch of 2 seats, one closed batch.
INSERT INTO public.programmes (id, slug, title, price_paise, is_published)
VALUES ('22222222-2222-4222-8222-222222222222', 'test-prog', 'Test Programme', 150000, true);

INSERT INTO public.programme_cohorts (id, programme_id, batch_name, starts_on, registration_closes_on, seats_total, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'Open batch', CURRENT_DATE + 30, CURRENT_DATE + 20, 2, 'open'),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222',
   'Closed batch', CURRENT_DATE + 30, CURRENT_DATE + 20, 50, 'closed'),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222',
   'Expired batch', CURRENT_DATE + 30, CURRENT_DATE - 1, 50, 'open');

-- Become an anonymous website visitor from here on.
SET ROLE anon;

\echo ''
\echo '=== 1. HAPPY PATH: a genuine registration should succeed ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Real Student', 'a@example.com', '9990001111', 'REF-AAA-001', 'pending_verification');

\echo ''
\echo '=== 2. ATTACK: claim to have paid Rs 1 instead of Rs 1500 ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, amount_paise, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Cheapskate', 'b@example.com', '9990002222', 'REF-BBB-002', 100, 'pending_verification');

\echo '--- what price actually got stored for that row? (expect 150000, not 100)'
RESET ROLE;
SELECT full_name, amount_paise, status FROM public.programme_registrations WHERE upi_reference = 'REF-BBB-002';
SET ROLE anon;

\echo ''
\echo '=== 3. ATTACK: self-confirm a seat without paying (expect REFUSED) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Freeloader', 'c@example.com', '9990003333', 'REF-CCC-003', 'confirmed');

\echo ''
\echo '=== 4. ATTACK: reuse someone else''s UPI reference (expect REFUSED) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Copycat', 'd@example.com', '9990004444', 'REF-AAA-001', 'pending_verification');

\echo ''
\echo '=== 5. ATTACK: register into a CLOSED batch (expect REFUSED) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('33333333-3333-4333-8333-333333333333', 'Latecomer', 'e@example.com', '9990005555', 'REF-EEE-005', 'pending_verification');

\echo ''
\echo '=== 6. ATTACK: register after the deadline passed (expect REFUSED) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('44444444-4444-4444-8444-444444444444', 'TooLate', 'f@example.com', '9990006666', 'REF-FFF-006', 'pending_verification');

\echo ''
\echo '=== 7. ATTACK: read other people''s contact details (expect 0 rows) ==='
SELECT count(*) AS rows_anon_can_read FROM public.programme_registrations;

\echo ''
\echo '=== 8. ATTACK: overbook a 2-seat batch with a 3rd registration (expect REFUSED) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Third', 'g@example.com', '9990007777', 'REF-GGG-007', 'pending_verification');

\echo ''
\echo '=== 9. Seat counts must still work for the public (expect taken=2) ==='
SELECT * FROM public.cohort_seat_counts(ARRAY['11111111-1111-4111-8111-111111111111']::uuid[]);

\echo ''
\echo '=== 10. ATTACK: promote my own registration to confirmed (expect 0 rows updated) ==='
UPDATE public.programme_registrations SET status = 'confirmed' WHERE upi_reference = 'REF-AAA-001';

\echo ''
\echo '=== 11. ATTACK: publish my own free programme (expect REFUSED) ==='
INSERT INTO public.programmes (slug, title, price_paise, is_published)
VALUES ('pirate', 'Pirate Programme', 0, true);

RESET ROLE;
\echo ''
\echo '=== FINAL LEDGER (what an admin sees) ==='
SELECT full_name, amount_paise, status, upi_reference FROM public.programme_registrations ORDER BY created_at;

-- Tests 3 and 4 were shadowed by the seat limit last run. Retry them
-- against an UNCAPPED batch so the defence under test is the one that fires.
\set ON_ERROR_STOP off
\pset pager off

INSERT INTO public.programme_cohorts (id, programme_id, batch_name, starts_on, registration_closes_on, seats_total, status)
VALUES ('55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222',
        'Uncapped batch', CURRENT_DATE + 30, CURRENT_DATE + 20, 0, 'open');

SET ROLE anon;

\echo ''
\echo '=== 3a. Baseline: a normal registration into the uncapped batch ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('55555555-5555-4555-8555-555555555555', 'Baseline', 'base@example.com', '9991110000', 'REF-BASE-100', 'pending_verification');

\echo ''
\echo '=== 3b. ATTACK: insert with status = confirmed, no payment (expect REFUSED or forced back) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('55555555-5555-4555-8555-555555555555', 'Freeloader', 'free@example.com', '9992220000', 'REF-FREE-101', 'confirmed');

\echo '--- if that row exists, what status did it actually get? (must NOT be confirmed)'
RESET ROLE;
SELECT full_name, status, amount_paise FROM public.programme_registrations WHERE upi_reference = 'REF-FREE-101';
SET ROLE anon;

\echo ''
\echo '=== 4a. ATTACK: reuse the baseline UPI reference (expect REFUSED, unique violation) ==='
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('55555555-5555-4555-8555-555555555555', 'Copycat', 'copy@example.com', '9993330000', 'REF-BASE-100', 'pending_verification');

\echo ''
\echo '=== 12. ATTACK: register for a DRAFT (unpublished) cohort (expect REFUSED) ==='
RESET ROLE;
INSERT INTO public.programme_cohorts (id, programme_id, batch_name, starts_on, seats_total, status)
VALUES ('66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222',
        'Draft batch', CURRENT_DATE + 60, 0, 'draft');
SET ROLE anon;
INSERT INTO public.programme_registrations (cohort_id, full_name, email, phone, upi_reference, status)
VALUES ('66666666-6666-4666-8666-666666666666', 'Sneaky', 'sneak@example.com', '9994440000', 'REF-SNEAK-102', 'pending_verification');

\echo ''
\echo '=== 13. Can anon even SEE the draft cohort? (expect 0 rows) ==='
SELECT count(*) AS draft_cohorts_visible FROM public.programme_cohorts WHERE status = 'draft';

\echo ''
\echo '=== 14. ATTACK: tamper with payment settings, e.g. swap in my own UPI id (expect REFUSED) ==='
UPDATE public.payment_settings SET upi_id = 'attacker@evil' WHERE id = true;

RESET ROLE;
\echo ''
\echo '=== FINAL LEDGER ==='
SELECT full_name, amount_paise, status, upi_reference FROM public.programme_registrations ORDER BY created_at;
\echo ''
\echo '=== payment settings intact? ==='
SELECT COALESCE(upi_id, '(unset)') AS upi_id FROM public.payment_settings;
