-- Online payments through Razorpay, for programmes, courses and notes.
--
-- Until now the only way to pay was UPI-with-a-reference, confirmed by an
-- admin against the bank statement (see programmes_cohorts_registrations).
-- That flow stays as a fallback. This adds a gateway path where the payment
-- is PROVEN rather than claimed: Razorpay signs every successful payment
-- with a secret only the server holds, and only the server-side Edge
-- Functions (supabase/functions/razorpay-*) can mark an order paid.
--
-- The rules that money depends on all live here or in those functions,
-- never in the browser:
--   * the amount is read from the programme/course/note row, not sent by
--     the client;
--   * clients cannot insert or update orders or purchases at all;
--   * fulfilment is one idempotent function, so the browser's "verify"
--     call and Razorpay's webhook can both fire for the same payment and
--     the student still gets exactly one purchase / one confirmed seat.
--
-- Money stays INTEGER paise, as everywhere else.

-- ── Settings: a switch, so nothing shows "Pay" before the keys exist ─────
ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS online_payments_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── Notes can be priced ──────────────────────────────────────────────────
-- is_free = false with price_paise = 0 means "only available as part of a
-- course": locked, but not sold on its own.
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_price_nonneg;
ALTER TABLE public.notes ADD CONSTRAINT notes_price_nonneg CHECK (price_paise >= 0);

-- The storage object a note's file_url points at. file_url is a stored
-- public-style URL (.../object/public/notes/<path>); the storage policy
-- below has to go from an object name back to its note, so the path is
-- kept as its own indexed column instead of being re-parsed per request.
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS file_path TEXT
  GENERATED ALWAYS AS (nullif(split_part(file_url, '/object/public/notes/', 2), '')) STORED;
CREATE INDEX IF NOT EXISTS notes_file_path_idx ON public.notes (file_path) WHERE NOT is_free;

-- ── Orders: one per checkout attempt ─────────────────────────────────────
CREATE TABLE public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- NULL only for programme registrations, which never required an
  -- account. Courses and notes are bought by a signed-in user, because the
  -- purchase has to attach to someone.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('programme', 'course', 'note')),
  -- programme -> the cohort id; course -> courses.id; note -> notes.id
  item_id UUID NOT NULL,
  registration_id UUID REFERENCES public.programme_registrations(id) ON DELETE SET NULL,
  item_title TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 100),
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT payment_orders_owner CHECK (item_type = 'programme' OR user_id IS NOT NULL),
  CONSTRAINT payment_orders_registration CHECK ((item_type = 'programme') = (registration_id IS NOT NULL))
);

CREATE INDEX payment_orders_user_idx ON public.payment_orders (user_id, created_at DESC);
CREATE INDEX payment_orders_status_idx ON public.payment_orders (status, created_at DESC);

-- ── Purchases: what a user owns ──────────────────────────────────────────
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'note')),
  item_id UUID NOT NULL,
  -- NULL for access an admin granted by hand (a scholarship, a refund
  -- dispute settled in the student's favour, a payment taken offline).
  order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT purchases_once UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX purchases_item_idx ON public.purchases (item_type, item_id);

-- ── Programme registrations can now be paid online ───────────────────────
ALTER TABLE public.programme_registrations
  ALTER COLUMN upi_reference DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'upi_manual';
ALTER TABLE public.programme_registrations DROP CONSTRAINT IF EXISTS programme_registrations_payment_method_check;
ALTER TABLE public.programme_registrations
  ADD CONSTRAINT programme_registrations_payment_method_check CHECK (payment_method IN ('upi_manual', 'razorpay'));
-- A manual registration is still nothing without its reference.
ALTER TABLE public.programme_registrations DROP CONSTRAINT IF EXISTS programme_registrations_upi_ref_required;
ALTER TABLE public.programme_registrations
  ADD CONSTRAINT programme_registrations_upi_ref_required CHECK (payment_method <> 'upi_manual' OR upi_reference IS NOT NULL);

ALTER TABLE public.programme_registrations DROP CONSTRAINT IF EXISTS programme_registrations_status_check;
ALTER TABLE public.programme_registrations
  ADD CONSTRAINT programme_registrations_status_check
  CHECK (status IN ('pending_payment', 'pending_verification', 'confirmed', 'rejected', 'cancelled'));

-- A seat is held for someone who is in the middle of paying, but only
-- briefly: an abandoned checkout must not keep a seat forever.
CREATE OR REPLACE FUNCTION public.registration_holds_seat(_status TEXT, _created TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT _status IN ('pending_verification', 'confirmed')
      OR (_status = 'pending_payment' AND _created > now() - interval '30 minutes');
$$;

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
      AND public.registration_holds_seat(status, created_at);
    IF _taken >= _cohort.seats_total THEN
      RAISE EXCEPTION 'This batch is full';
    END IF;
  END IF;

  SELECT p.price_paise INTO _price
  FROM public.programmes p
  WHERE p.id = _cohort.programme_id;

  NEW.amount_paise := COALESCE(_price, 0);
  -- An online registration starts out waiting for the gateway; only the
  -- fulfilment function (service role) moves it on. The RLS policy below
  -- only lets the public insert 'pending_verification', so a stranger
  -- cannot create a 'pending_payment' row to squat on seats either.
  NEW.status := CASE WHEN NEW.payment_method = 'razorpay' THEN 'pending_payment' ELSE 'pending_verification' END;
  NEW.admin_note := NULL;
  NEW.reviewed_at := NULL;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Public submit registrations" ON public.programme_registrations;
CREATE POLICY "Public submit registrations" ON public.programme_registrations
  FOR INSERT WITH CHECK (status = 'pending_verification' AND payment_method = 'upi_manual');

CREATE OR REPLACE FUNCTION public.cohort_seat_counts(_cohort_ids uuid[])
RETURNS TABLE (cohort_id uuid, taken bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.cohort_id, count(*)
  FROM public.programme_registrations r
  WHERE r.cohort_id = ANY(_cohort_ids)
    AND public.registration_holds_seat(r.status, r.created_at)
  GROUP BY r.cohort_id;
$$;

-- ── Access checks ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_course_access(_course_id uuid)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.is_free)
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.user_id = auth.uid() AND p.item_type = 'course' AND p.item_id = _course_id
      );
$$;

-- A note is open if it is free, or the caller bought it, or bought any
-- course that contains it.
CREATE OR REPLACE FUNCTION public.has_note_access(_note_id uuid)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.notes n WHERE n.id = _note_id AND NOT n.is_free)
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.user_id = auth.uid() AND p.item_type = 'note' AND p.item_id = _note_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchases p
        JOIN public.course_items ci ON ci.course_id = p.item_id AND ci.kind = 'note'
        WHERE p.user_id = auth.uid() AND p.item_type = 'course' AND ci.ref_id = _note_id
      );
$$;

-- Storage asks this for every object it signs. An object that belongs to
-- no paid note stays readable exactly as before.
CREATE OR REPLACE FUNCTION public.note_object_readable(_object_name text)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.notes n
    WHERE NOT n.is_free AND n.file_path = _object_name
      AND NOT public.has_note_access(n.id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_course_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_note_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.note_object_readable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_course_access(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_note_access(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.note_object_readable(text) TO anon, authenticated, service_role;

-- The bucket is already private (private_download_buckets): files are
-- only reachable through a signed URL, and signing needs this SELECT. So
-- narrowing it is what actually locks a paid PDF — hiding a button would
-- not.
DROP POLICY IF EXISTS "Anyone can read note files" ON storage.objects;
CREATE POLICY "Anyone can read note files" ON storage.objects
  FOR SELECT USING (bucket_id = 'notes' AND public.note_object_readable(name));

-- ── Fulfilment: the only way an order becomes paid ───────────────────────
-- Called by the Edge Functions with the service role after they have
-- checked Razorpay's signature. Locks the order row, so the browser's
-- verify call and the webhook racing each other serialise here and the
-- second one sees 'paid' and does nothing.
CREATE OR REPLACE FUNCTION public.fulfil_payment_order(_razorpay_order_id text, _razorpay_payment_id text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.payment_orders
  WHERE razorpay_order_id = _razorpay_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown order %', _razorpay_order_id;
  END IF;

  IF o.status = 'paid' THEN
    RETURN jsonb_build_object('status', 'paid', 'already', true, 'item_type', o.item_type, 'item_id', o.item_id);
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid', razorpay_payment_id = _razorpay_payment_id, paid_at = now()
  WHERE id = o.id;

  IF o.item_type IN ('course', 'note') THEN
    INSERT INTO public.purchases (user_id, item_type, item_id, order_id)
    VALUES (o.user_id, o.item_type, o.item_id, o.id)
    ON CONFLICT (user_id, item_type, item_id) DO NOTHING;
  ELSE
    -- Confirmed even if the 30-minute hold lapsed meanwhile: the student
    -- has paid, and over-filling a batch by one is an admin's call to
    -- make, not something to silently take money for.
    UPDATE public.programme_registrations
    SET status = 'confirmed', reviewed_at = now(),
        admin_note = 'Paid online (Razorpay ' || _razorpay_payment_id || ')'
    WHERE id = o.registration_id AND status <> 'confirmed';
  END IF;

  RETURN jsonb_build_object('status', 'paid', 'already', false, 'item_type', o.item_type, 'item_id', o.item_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfil_payment_order(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfil_payment_order(text, text) TO service_role;

-- ── Row level security ───────────────────────────────────────────────────
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Orders: read your own; admins read all. Nobody writes from a browser.
CREATE POLICY "Users read own orders" ON public.payment_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all orders" ON public.payment_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Purchases: read your own; admins read all and may grant or revoke by
-- hand. A student can never insert one.
CREATE POLICY "Users read own purchases" ON public.purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all purchases" ON public.purchases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins grant purchases" ON public.purchases
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins revoke purchases" ON public.purchases
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;
GRANT SELECT, INSERT, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
