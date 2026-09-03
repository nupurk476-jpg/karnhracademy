# Registration security tests

The programme registration flow takes money without a payment gateway: a
student pays by UPI and types their own transaction reference, which proves
nothing on its own. Everything that money depends on is therefore enforced
in the database — a browser check is only a suggestion to anyone posting
straight at the REST API.

These scripts execute that migration against a plain Postgres and then
attack it, so the rules can be re-checked after any change rather than
taken on trust.

## Running them

Needs Postgres 16 locally. `initdb` refuses to run as root, so run as an
unprivileged user.

```bash
export PATH=$PATH:/usr/lib/postgresql/16/bin
initdb -D /tmp/pgtest -U postgres --auth=trust
pg_ctl -D /tmp/pgtest -o '-k /tmp -p 5433 -c listen_addresses=' -l /tmp/pg.log start

createdb -h /tmp -p 5433 -U postgres apptest
psql -h /tmp -p 5433 -U postgres -d apptest -v ON_ERROR_STOP=1 \
  -f supabase/tests/00_supabase_stubs.sql
psql -h /tmp -p 5433 -U postgres -d apptest -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260903120000_programmes_cohorts_registrations.sql
psql -h /tmp -p 5433 -U postgres -d apptest \
  -f supabase/tests/01_registration_security.sql
```

`00_supabase_stubs.sql` stands in for what Supabase provides as baseline —
the `app_role` enum, `public.has_role()`, `auth.uid()`, the `anon` /
`authenticated` / `service_role` roles, and `USAGE` on the `public` schema.
It is not part of the migration and must never be applied to a real
project.

## What must hold

Run as `anon` — an anonymous website visitor. Every one of these must be
refused, and the two legitimate operations must still work.

| Attack | Expected | Enforced by |
| :--- | :--- | :--- |
| Register claiming ₹1 instead of the real fee | price forced to the programme's | `prepare_programme_registration` trigger |
| Insert with `status = 'confirmed'` | forced back to `pending_verification` | same trigger, plus the INSERT policy |
| Reuse another student's UPI reference | rejected | `UNIQUE` on `upi_reference` |
| Register into a closed batch | rejected | trigger |
| Register after the deadline | rejected | trigger |
| Register into a draft batch | rejected | trigger |
| Take a seat in a full batch | rejected | trigger |
| Read other students' contact details | permission denied | no SELECT grant or policy for `anon` |
| Promote your own registration to confirmed | permission denied | no UPDATE grant for `anon` |
| Create or publish a programme | permission denied | admin-only policies |
| See draft batches | 0 rows | cohort SELECT policy |
| Swap the UPI id in payment settings | permission denied | admin-only UPDATE policy |
| **Register normally** | **succeeds** | — |
| **Read seat counts** | **succeeds** | `cohort_seat_counts`, `SECURITY DEFINER` |

### Two results that look wrong but are not

**Self-confirming does not raise an error.** The insert is accepted and the
row is silently rewritten to `pending_verification`. The attack fails
because the seat is not confirmed, not because the request bounced — the
row simply lands in the admin queue like any other. Assert on the stored
`status`, never on whether the statement errored.

**A seat-limited batch masks later tests.** If earlier registrations fill
the batch, every subsequent attack fails with "This batch is full" and
proves nothing about the defence it was named for. That is why the later
tests use an uncapped batch. A test that passes for the wrong reason is
worse than no test.
