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
