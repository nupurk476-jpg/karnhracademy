# send-welcome-email

Sends the welcome email once per new account. Fires for every sign-up
route — Google and email/password alike — because it hangs off the
`auth.users` insert trigger rather than any particular login screen.

## How it fits together

```
sign-up (Google or password)
  -> INSERT auth.users
  -> trigger handle_new_user()
       -> INSERT public.profiles           (existing behaviour)
       -> INSERT public.welcome_emails     (queued, exception-safe)
  -> Database Webhook on welcome_emails INSERT
  -> this function
       -> reads the queue (never the request body)
       -> claims the row by stamping sent_at
       -> POSTs to Brevo
```

The queue is the point. Postgres does not wait on Brevo's HTTP response
inside the transaction that creates a user, a failed send stays visible
and retryable in a table instead of vanishing, and `user_id` being the
primary key makes a second welcome impossible no matter how many times a
webhook retries or a person signs in.

Enqueueing is wrapped in an exception block: if it ever fails, the
sign-up still succeeds. A missed welcome email is a small problem; a
student who cannot create an account is not.

## Deploy

Requires the Supabase CLI, logged in and linked to this project.

```bash
# 1. Secrets. Neither value may ever appear in client code.
supabase secrets set BREVO_API_KEY=xxxxxxxx
supabase secrets set WELCOME_HOOK_SECRET="$(openssl rand -hex 32)"   # save this

# 2. Deploy. --no-verify-jwt because the caller is a Database Webhook,
#    not a signed-in user; the shared secret header is the auth instead.
supabase functions deploy send-welcome-email --no-verify-jwt
```

Then in the Supabase dashboard → **Database → Webhooks → Create a new
hook**:

| Field | Value |
|---|---|
| Table | `public.welcome_emails` |
| Events | `Insert` |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://<project-ref>.supabase.co/functions/v1/send-welcome-email` |
| HTTP Headers | `x-welcome-secret: <the WELCOME_HOOK_SECRET value>` |

## Before it will deliver anything

`nupur@karnhracademy.com` must be a **verified sender** in Brevo
(Settings → Senders). Domain authentication alone is not enough — Brevo
rejects a send from an unverified sender address, and the reason comes
back in `welcome_emails.last_error`.

## Checking on it

```sql
-- Anything stuck?
select email, attempts, last_error, created_at
from welcome_emails
where sent_at is null
order by created_at;

-- Recently sent
select email, name, provider, sent_at
from welcome_emails
where sent_at is not null
order by sent_at desc
limit 20;
```

Retry everything that failed:

```sql
update welcome_emails set attempts = 0, last_error = null
where sent_at is null;
```

Then invoke the function once to drain the backlog:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-welcome-email" \
  -H "x-welcome-secret: <secret>"
```

A row is abandoned after 3 attempts so one permanently bad address cannot
occupy every batch.

## Changing the email

Edit `email-templates/welcome.html` / `.txt`, then regenerate the copy
this function compiles in:

```bash
node scripts/sync-email-templates.mjs
supabase functions deploy send-welcome-email --no-verify-jwt
```

`template.ts` is generated. Editing it directly means the next sync
silently discards the change.
