# PollHub

Read [POLLHUB_CODEX_GUIDE.md](POLLHUB_CODEX_GUIDE.md) fully before writing any code — it is the single source of truth for architecture, patterns, validation rules, and forbidden patterns (no `.single()`, no TypeScript, no new UI libraries, etc.).

See [PLAN.md](PLAN.md) for the original build plan and rationale.

## Current status

- MVP is built and deployed: https://pollhub-z837.vercel.app/
- Auth, poll creation/voting, comments, feed sort/filter, and sidebar stats are all working against a real Supabase project.
- Supabase schema lives in `supabase/schema.sql`; `supabase/fix_trigger.sql` documents a fix applied to the new-user trigger (it must run as `security definer set search_path = public` with explicit grants to `supabase_auth_admin`, or signup fails with a generic "Database error saving new user").
- Deploys automatically on every push to `main` on GitHub (`woohub420/Pollhub`).
- The user is new to programming — explain *why*, not just *what*, and prefer walking through changes over silently applying them.

## Known gaps / not yet done

- Supabase "Confirm email" is currently OFF for easier local testing — turn it back on before treating this as production-ready for real users.
- Feed sort/filter/sidebar have only been verified with 1-2 polls, not a larger dataset.
- No automated tests yet.
