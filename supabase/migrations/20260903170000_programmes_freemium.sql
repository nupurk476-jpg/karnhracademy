-- Reshape `programmes` for the freemium catalogue: cards with a struck-through
-- MRP, a category, and a longer sales description.
--
-- ALTER rather than recreate. This table is live, and programme_cohorts,
-- programme_registrations and payment_settings all hang off it — dropping it
-- would take the working UPI registration flow with it.
--
-- Money stays in INTEGER paise. The brief asked for `price_inr`, but Razorpay
-- charges in paise, and integer rupees cannot express ₹1,499.50. Rupees are an
-- input format, converted once at the edge in Admin; paise is what is stored,
-- compared and charged. `mrp_paise` follows the same rule so the two can be
-- compared without a unit conversion in between.

-- ── Renames to the catalogue vocabulary ──────────────────────────────────
ALTER TABLE public.programmes RENAME COLUMN subtitle TO short_description;
ALTER TABLE public.programmes RENAME COLUMN description TO long_description;
ALTER TABLE public.programmes RENAME COLUMN is_published TO is_active;
ALTER TABLE public.programmes RENAME COLUMN display_order TO sort_order;

-- ── New catalogue columns ────────────────────────────────────────────────
ALTER TABLE public.programmes
  ADD COLUMN mrp_paise INTEGER CHECK (mrp_paise IS NULL OR mrp_paise >= 0),
  ADD COLUMN category TEXT;

-- highlights (text[]) becomes includes (jsonb), preserving what is there.
ALTER TABLE public.programmes ADD COLUMN includes JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.programmes SET includes = to_jsonb(highlights);
ALTER TABLE public.programmes DROP COLUMN highlights;

-- A struck-through MRP below the asking price is not a discount, it is a lie.
ALTER TABLE public.programmes
  ADD CONSTRAINT programmes_mrp_above_price
  CHECK (mrp_paise IS NULL OR mrp_paise >= price_paise);

-- ── The public read policy follows the renamed column ────────────────────
DROP POLICY IF EXISTS "Public read published programmes" ON public.programmes;
CREATE POLICY "Public read active programmes" ON public.programmes
  FOR SELECT USING (is_active = true);

-- Note: prepare_programme_registration() needs no change. It reads
-- programmes.price_paise, which keeps both its name and its meaning, and
-- never looked at is_published or display_order.

COMMENT ON COLUMN public.programmes.price_paise IS
  'Asking price in paise. Rupees are an input format only — never store them.';
COMMENT ON COLUMN public.programmes.mrp_paise IS
  'Optional "was" price shown struck through. Must be >= price_paise.';
