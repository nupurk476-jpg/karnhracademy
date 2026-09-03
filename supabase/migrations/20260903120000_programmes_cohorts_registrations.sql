-- Paid programmes (GD/PI first), their dated cohorts, and registrations
-- paid by UPI and confirmed by hand against a bank statement.
--
-- There is no payment gateway yet, so nothing here can *prove* a payment.
-- The security model is deliberately narrow: the public may only ever
-- create a row that says "I claim I paid, here is my reference". Only an
-- admin, having checked the actual bank statement, can move it to
-- confirmed. Every rule that money depends on is enforced server-side,
-- because a client-side check is only a suggestion to anyone posting
-- straight at the REST API.
--
-- Money is stored as INTEGER paise, never a float — 0.1 + 0.2 problems
-- have no place in a fee ledger.

-- ── Programmes ───────────────────────────────────────────────────────────
CREATE TABLE public.programmes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  -- Bullet points shown on the detail page ("what you get").
  highlights TEXT[] NOT NULL DEFAULT '{}',
  price_paise INTEGER NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  duration_note TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── Cohorts (a dated batch of a programme) ───────────────────────────────
CREATE TABLE public.programme_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE,
  registration_closes_on DATE,
  -- 0 means "no seat limit"; any positive number is enforced on insert.
  seats_total INTEGER NOT NULL DEFAULT 0 CHECK (seats_total >= 0),
  schedule_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX programme_cohorts_programme_idx ON public.programme_cohorts (programme_id);

-- ── Registrations ────────────────────────────────────────────────────────
CREATE TABLE public.programme_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id UUID NOT NULL REFERENCES public.programme_cohorts(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT,
  course TEXT,
  -- The UPI/UTR reference the student typed. UNIQUE so one reference
  -- cannot be reused across registrations — a student passing a friend
  -- their transaction id is the cheapest way to get a free seat, and this
  -- closes it. It is still only a claim: confirm against the statement.
  upi_reference TEXT NOT NULL UNIQUE,
  -- Set by trigger from the programme's price, never from the client.
  amount_paise INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification', 'confirmed', 'rejected', 'cancelled')),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX programme_registrations_cohort_idx ON public.programme_registrations (cohort_id);
CREATE INDEX programme_registrations_status_idx ON public.programme_registrations (status);

-- ── Payment settings (single row) ────────────────────────────────────────
-- Only ever the UPI handle and a QR image: both are meant to be shown to
-- payers. Never put a bank account number or IFSC here — this row is
-- world-readable by design.
CREATE TABLE public.payment_settings (
  id BOOLEAN NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  upi_id TEXT,
  upi_qr_url TEXT,
  payee_label TEXT,
  instructions TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.payment_settings (id, payee_label, instructions)
VALUES (true, 'Karn HR Academy', 'Pay the exact amount shown, then enter your UPI reference number below. Your seat is confirmed once we match the payment against our account — usually within 24 hours.');

-- ── Server-side gate on new registrations ────────────────────────────────
-- Runs as the table owner so it can read cohort/programme state and count
-- existing rows regardless of the caller's RLS. Everything money-relevant
-- is decided here, not in the browser.
CREATE OR REPLACE FUNCTION public.prepare_programme_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cohort public.programme_cohorts%ROWTYPE;
  _price INTEGER;
  _taken INTEGER;
BEGIN
  SELECT * INTO _cohort FROM public.programme_cohorts WHERE id = NEW.cohort_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown cohort';
  END IF;

  IF _cohort.status <> 'open' THEN
    RAISE EXCEPTION 'Registration for this batch is not open';
  END IF;

  IF _cohort.registration_closes_on IS NOT NULL
     AND _cohort.registration_closes_on < CURRENT_DATE THEN
    RAISE EXCEPTION 'Registration for this batch has closed';
  END IF;

  IF _cohort.seats_total > 0 THEN
    SELECT count(*) INTO _taken
    FROM public.programme_registrations
    WHERE cohort_id = NEW.cohort_id
      AND status IN ('pending_verification', 'confirmed');
    IF _taken >= _cohort.seats_total THEN
      RAISE EXCEPTION 'This batch is full';
    END IF;
  END IF;

  -- Price comes from the programme, so a crafted request cannot register
  -- itself at ₹1 and leave a plausible-looking row in the ledger.
  SELECT p.price_paise INTO _price
  FROM public.programmes p
  WHERE p.id = _cohort.programme_id;

  NEW.amount_paise := COALESCE(_price, 0);
  NEW.status := 'pending_verification';
  NEW.admin_note := NULL;
  NEW.reviewed_at := NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER programme_registrations_prepare
  BEFORE INSERT ON public.programme_registrations
  FOR EACH ROW EXECUTE FUNCTION public.prepare_programme_registration();

-- ── Seat counts without exposing registrations ───────────────────────────
-- The public needs "3 seats left" but must never read the registration
-- rows themselves, which are full of personal data. SECURITY DEFINER,
-- returning nothing but integers.
CREATE OR REPLACE FUNCTION public.cohort_seat_counts(_cohort_ids uuid[])
RETURNS TABLE (cohort_id uuid, taken bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.cohort_id, count(*)
  FROM public.programme_registrations r
  WHERE r.cohort_id = ANY(_cohort_ids)
    AND r.status IN ('pending_verification', 'confirmed')
  GROUP BY r.cohort_id;
$$;

REVOKE EXECUTE ON FUNCTION public.cohort_seat_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cohort_seat_counts(uuid[]) TO anon, authenticated;

-- ── Row level security ───────────────────────────────────────────────────
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Programmes: published ones are public; admins see and edit everything.
CREATE POLICY "Public read published programmes" ON public.programmes
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admin read all programmes" ON public.programmes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin insert programmes" ON public.programmes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update programmes" ON public.programmes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete programmes" ON public.programmes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Cohorts: anything not a draft is public (so a closed batch can still say
-- "closed" rather than vanishing); admins see and edit everything.
CREATE POLICY "Public read live cohorts" ON public.programme_cohorts
  FOR SELECT USING (status <> 'draft');
CREATE POLICY "Admin read all cohorts" ON public.programme_cohorts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin insert cohorts" ON public.programme_cohorts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update cohorts" ON public.programme_cohorts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete cohorts" ON public.programme_cohorts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Registrations: the public may INSERT and nothing else. No SELECT policy
-- for anon/authenticated at all, so nobody can read anyone's contact
-- details back out. The WITH CHECK pins the status a stranger may create;
-- the trigger above re-asserts it, so both the policy and the trigger have
-- to be wrong before a self-confirmed registration is possible.
CREATE POLICY "Public submit registrations" ON public.programme_registrations
  FOR INSERT WITH CHECK (status = 'pending_verification');
CREATE POLICY "Admin read registrations" ON public.programme_registrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update registrations" ON public.programme_registrations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete registrations" ON public.programme_registrations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Payment settings: readable by anyone (it is what the payer must see),
-- writable only by admins.
CREATE POLICY "Public read payment settings" ON public.payment_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin update payment settings" ON public.payment_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ── Table privileges ─────────────────────────────────────────────────────
-- RLS decides which ROWS a caller may touch; these decide whether the role
-- may touch the table at all. Supabase's default privileges usually grant
-- these automatically, but stating them is free and makes the migration
-- correct on a project where those defaults were never set — matching what
-- the lectures and live_lectures migrations already do here.
--
-- Note what anon does NOT get on registrations: SELECT. A visitor may file
-- one and never read one. This works because the client inserts without
-- asking for the row back (supabase-js sends Prefer: return=minimal unless
-- .select() is chained), so nothing needs to read it.
GRANT SELECT ON public.programmes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programmes TO authenticated;
GRANT ALL ON public.programmes TO service_role;

GRANT SELECT ON public.programme_cohorts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_cohorts TO authenticated;
GRANT ALL ON public.programme_cohorts TO service_role;

GRANT INSERT ON public.programme_registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_registrations TO authenticated;
GRANT ALL ON public.programme_registrations TO service_role;

GRANT SELECT ON public.payment_settings TO anon;
GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;

-- ── Seed: the GD/PI programme, unpublished and unpriced ──────────────────
-- Deliberately is_published = false with price 0 and no cohort: set the
-- real price and batch dates in Admin, then publish. Nothing is guessed
-- here, because a wrong price on a live page takes real money.
INSERT INTO public.programmes (slug, title, subtitle, description, highlights, price_paise, duration_note, is_published, display_order)
VALUES (
  'gd-pi-preparation',
  'GD & PI Preparation',
  'Group Discussion and Personal Interview coaching for MBA/BBA admissions',
  'A structured batch covering group discussion technique, personal interview practice, and the questions HR panels actually ask. Runs to a fixed calendar with limited seats so every participant gets speaking time.',
  ARRAY[
    'Live group discussion practice in small batches',
    'Mock personal interviews with individual feedback',
    'Common HR interview questions and how to structure answers',
    'Resume and CV review before the interview round',
    'Session recordings and notes for revision'
  ],
  0,
  'Set the batch dates in Admin',
  false,
  1
);
