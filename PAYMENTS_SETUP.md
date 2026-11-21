# Online payments (Razorpay) — setup

Students can pay online for **programmes** (seat confirmed instantly),
**paid courses** and **paid notes** (unlocked instantly). Nothing appears on
the site until step 6, so you can do this at your own pace.

Do everything in **Test mode** first. No real money moves in test mode.

---

## 1. Get Razorpay test keys

1. Sign up at <https://dashboard.razorpay.com>.
2. Make sure the toggle at the top says **Test Mode**.
3. Go to **Account & Settings → API Keys → Generate Test Key**.
4. Copy the **Key ID** (starts `rzp_test_`) and the **Key Secret**. The secret
   is shown only once, so keep it somewhere safe. Never paste it into
   the website code, a chat, or an email.

## 2. Update the database

Supabase dashboard → **SQL Editor** → **New query** → paste the entire
contents of `supabase/migrations/20261121120000_razorpay_payments.sql` →
**Run**. It should say "Success. No rows returned".

## 3. Deploy the three server functions

These run on Supabase, not in the browser, because they hold the secret key.

**Option A: dashboard (no tools needed).** Supabase dashboard → **Edge
Functions** → **Deploy a new function** → **Via Editor**. Do this three
times, using these names *exactly*:

| Function name        | Paste the contents of                              |
|----------------------|----------------------------------------------------|
| `razorpay-checkout`  | `supabase/functions/razorpay-checkout/index.ts`    |
| `razorpay-verify`    | `supabase/functions/razorpay-verify/index.ts`      |
| `razorpay-webhook`   | `supabase/functions/razorpay-webhook/index.ts`     |

After deploying each one, open its **Details / Settings** and switch **off**
"Enforce JWT verification" (also called "Verify JWT"). Each function does
its own security checks, and Razorpay can't send a Supabase login token,
so the webhook fails while this is on.

**Option B: Supabase CLI.** `supabase functions deploy razorpay-checkout razorpay-verify razorpay-webhook`
(`supabase/config.toml` already turns JWT verification off for them).

## 4. Add the secrets

Supabase dashboard → **Edge Functions → Secrets** (or **Project Settings →
Edge Functions**). Add:

| Name                       | Value                                              |
|----------------------------|----------------------------------------------------|
| `RAZORPAY_KEY_ID`          | your Key ID from step 1                            |
| `RAZORPAY_KEY_SECRET`      | your Key Secret from step 1                        |
| `RAZORPAY_WEBHOOK_SECRET`  | a long random password you make up (used in step 5) |

## 5. Add the webhook in Razorpay

This is the safety net: if a student pays and then closes the page, Razorpay
still tells the site, and they still get access.

Razorpay dashboard → **Account & Settings → Webhooks → Add New Webhook**:

- **Webhook URL:** `https://miynvbkcufwrofgdrtap.supabase.co/functions/v1/razorpay-webhook`
- **Secret:** the same value you used for `RAZORPAY_WEBHOOK_SECRET`
- **Active events:** tick `payment.captured` and `order.paid`

## 6. Switch it on

Website → **Admin → Payment Settings** → tick **Accept online payments
(Razorpay)** → **Save settings**.

## 7. Set prices

- **Programmes:** Admin → Programmes. The price you already set is the price
  charged online.
- **Courses:** Admin → Courses → click the price (it says "Free") → enter a
  price → Save. Leave **"Also lock its notes"** ticked. Otherwise the
  notes stay free on the subject pages and nobody needs to buy the course.
  MCQs and lectures stay free either way.
- **Notes:** Admin → Notes → edit a note → **Access: Paid** → price. Leave
  the price empty to sell it *only* as part of a course.

## 8. Test it

Open a paid course or note in a private/incognito window, sign in as a
normal (non-admin) student, and buy it. In test mode, pay with the UPI ID
`success@razorpay`, or one of the cards listed on Razorpay's
[test card page](https://razorpay.com/docs/payments/payments/test-card-details/).
Check:

- the course/note unlocks straight away;
- it appears under **Profile → My purchases**;
- it appears in **Admin → Payments**;
- for a programme, the registration shows as **Confirmed** in Admin →
  Registrations, marked "Paid online".

(Admins can always open everything, so test as a student.)

## 9. Go live

1. Finish Razorpay's activation (KYC: PAN, bank account, business details).
   Razorpay checks that the site has Terms, Privacy, Refund and Contact
   pages; these already exist.
2. Switch the Razorpay dashboard to **Live Mode** and generate **live** API
   keys (`rzp_live_...`).
3. In Supabase secrets, replace `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
   with the live ones.
4. Add the webhook again **in Live Mode** (test and live webhooks are
   separate), with the same URL, secret and events.
5. Make one small real purchase yourself to confirm.

## Day to day

- **Refunds** are issued from the Razorpay dashboard (search the payment ID
  shown in Admin → Payments). A refund does not automatically take access
  away. Ask if you want that added.
- **Manual UPI** registrations still work as before: students can choose
  "Already paid by UPI? Enter your reference instead", and you confirm them
  in Admin → Registrations.
- **Turning payments off:** untick the box in Payment Settings. Buy buttons
  change to "Purchases open soon", and nothing a student already bought is
  affected.
