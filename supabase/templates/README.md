# Auth email templates

## Installing `welcome-confirm-signup.html`

Supabase Dashboard → **Authentication** → **Emails** → **Confirm signup** →
paste the file contents into the message body. Suggested subject:

> Welcome to Karn HR Academy — confirm your email

### The one thing you must not remove

`{{ .ConfirmationURL }}` appears twice — once on the button, once as a
pasteable link. **Delete either and nobody can activate their account.** The
signup flow calls `supabase.auth.signUp`, so this is the only email that
fires, which is why it is both the welcome and the confirmation.

Test it by signing up with an address you own before pointing students at it.

## The greeting

The email opens `Hello {name},` read from user metadata:

```
{{ if .Data.display_name }}…{{ else if .Data.full_name }}…{{ else if .Data.name }}…{{ else }}Hello,{{ end }}
```

`AuthPage` already stores `display_name` on email/password signup, falling
back to the part of the address before the `@`. Google accounts arrive with
`full_name` or `name` instead. The final `{{ else }}` matters: without it a
missing name renders `Hello ,` or prints `nil` at someone.

Worth knowing: **Google sign-ins usually never receive this email at all** —
Google has already verified the address, so Supabase skips confirmation. In
practice this template is read by email/password signups.

## Before it goes to real people

**A postal address is deliberately absent.** This is a transactional
confirmation, which is exempt from the physical-address rule that applies to
marketing mail. If you later send a newsletter, an offer, or anything
promotional, that send is not exempt and will need one.

**Set up custom SMTP.** Supabase's built-in email sender is rate-limited to a
handful of messages per hour and is explicitly not for production — signups
will silently stop receiving mail once you cross it. Dashboard → Project
Settings → Authentication → SMTP Settings. Any transactional provider works
(Resend, Postmark, Amazon SES, Brevo).

**Authenticate the sending domain** with SPF, DKIM and DMARC, through
whichever provider you choose. Mail from an unauthenticated domain lands in
spam often enough that the template's design stops mattering.

## Why it is built the way it is

Email HTML is not web HTML. There is no flexbox or grid, external stylesheets
are stripped, and Outlook on Windows renders with Word's engine.

- **Tables for layout, styles inline.** The `<style>` block holds only the
  mobile media query, which Outlook ignores — nothing load-bearing is in it.
- **The button is a table**, not a padded `<a>`. Outlook drops padding on
  inline elements and the button collapses to bare text.
- **Bullets are table rows**, not `<ul>`. List indentation is among the
  things Outlook handles worst.
- **The vermillion masthead rule is a 4px table cell**, not `border-left`,
  for the same reason.

### Fonts will not match the site exactly, and that is expected

Gmail strips web fonts and Outlook desktop ignores them, so **Playfair Display
will not load for most recipients**. The stack is
`'Playfair Display', Georgia, 'Times New Roman', serif` — Apple Mail may show
Playfair; nearly everyone else sees Georgia, a serif close enough in warmth
that the email still reads as the same brand. Body text uses Arial for the
same reason.

The screenshots this template was checked against render in Georgia, so they
show the common case rather than the best one.

### Colours

Taken from `src/lib/brand.ts` so the email matches the site: ink `#17181C`,
vermillion `#E34234`, vermillion-on-light `#8C2A1E`, ivory `#F7F4EF`, tint
`#F2F1EF`, border `#DCD9D3`, body text `#55514C`.

`color-scheme: light` is declared so Gmail and Apple Mail stop synthesising a
dark version and turning the ink masthead to mud.

## A separate welcome email, later

If you ever want welcome and confirmation split — a warmer message *after*
someone confirms — that needs a Postgres trigger or Auth Hook calling an Edge
Function that sends through your provider. It is real work, and worth doing
only once signups are steady enough to justify it. One good email beats two
mediocre ones.

---

# Google sign-ins: `send-welcome-email`

Google sign-in produces **no Supabase email at all** — Google has verified the
address, so confirmation is skipped and the user lands in the app having heard
nothing. Configuring Brevo as SMTP does not change this: SMTP only delivers
mail Supabase decides to send, and for OAuth it decides to send none.

So that welcome is sent by an Edge Function calling the Brevo API directly.

| Signup route | What sends | Which template |
| :--- | :--- | :--- |
| Email + password | Supabase, automatically | `welcome-confirm-signup.html` (dashboard) |
| Continue with Google | `send-welcome-email` function | `functions/send-welcome-email/email.ts` |

The two are deliberately different. The Google one has **no confirm button** —
there is nothing to confirm, and a prominent button that does nothing is the
fastest way to make a first impression look broken.

## Deploying it

**1. Get a Brevo API key.** This is *not* the SMTP credential you gave
Supabase. Brevo → SMTP & API → **API Keys** → create one.

**2. Set the secrets.** These are server-side and must never carry a `VITE_`
prefix, which would compile them into the public browser bundle:

```bash
supabase secrets set BREVO_API_KEY=xkeysib-...
supabase secrets set BREVO_SENDER_EMAIL=noreply@karnhracademy.com
supabase secrets set BREVO_SENDER_NAME="Karn HR Academy"
```

The sender address must be a verified sender in Brevo, or Brevo rejects
the send.

**3. Apply the migration** `20260910120000_welcome_emails.sql`.

**4. Deploy:**

```bash
supabase functions deploy send-welcome-email
```

**5. Test** by signing in with a Google account that has never used the site.
Check the inbox, then `select * from welcome_emails;` — one row.

## How it decides to send

The browser only ever *asks*. It never says who to email.

- The function identifies the caller from their own access token and reads the
  address from the verified user record. Nobody can point it at an address
  that is not theirs.
- The row in `welcome_emails` is **claimed before the send**, and its primary
  key is the lock. Two tabs racing produce one email. Claiming first means a
  crash mid-send costs one missed email rather than sending several.
- If Brevo rejects the send, the claim is released so a later sign-in retries,
  rather than marking someone welcomed by an email that never arrived.
- Names from OAuth profiles are HTML-escaped. A display name containing markup
  renders as text instead of becoming part of the email.

## If it does not fire

Check, in order: the function logs in the Supabase dashboard; that all three
secrets are set (`supabase secrets list`); that the sender is verified in
Brevo; and that `welcome_emails` has no stale row for that user — delete it to
allow a resend.
