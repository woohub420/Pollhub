# PollHub

Read [POLLHUB_CODEX_GUIDE.md](POLLHUB_CODEX_GUIDE.md) fully before writing any code — it is the single source of truth for architecture, patterns, validation rules, and forbidden patterns (no `.single()`, no TypeScript, no new UI libraries, etc.).

See [PLAN.md](PLAN.md) for the original build plan and rationale.

## Current status

- MVP is built and deployed: https://pollhub-z837.vercel.app/
- Auth, poll creation/voting, comments, feed sort/filter, and sidebar stats are all working against a real Supabase project.
- Google sign-in is implemented (`AuthContext.signInWithGoogle`); new Google users are prompted for a required username via `CompleteProfileModal` since Google doesn't supply one and `profiles.username` allows NULL until set (see `supabase/enable_google_auth.sql`).
- Polls support an optional single image/video attachment, uploaded to the `poll-media` Supabase Storage bucket (see `supabase/enable_poll_media.sql`). Videos autoplay muted when scrolled into view and pause when scrolled out, via the `useAutoplayOnVisible` IntersectionObserver hook (`src/lib/useAutoplayOnVisible.js`) — mirrors the Reddit/Instagram/Facebook feed pattern.
- Supabase schema lives in `supabase/schema.sql`; `supabase/fix_trigger.sql` documents a fix applied to the new-user trigger (it must run as `security definer set search_path = public` with explicit grants to `supabase_auth_admin`, or signup fails with a generic "Database error saving new user").
- Deploys automatically on every push to `main` on GitHub (`woohub420/Pollhub`).
- The user is new to programming — explain *why*, not just *what*, and prefer walking through changes over silently applying them.

## Known gaps / not yet done

- Supabase "Confirm email" is currently OFF for easier local testing — turn it back on before treating this as production-ready for real users.
- Feed sort/filter/sidebar have only been verified with 1-2 polls, not a larger dataset.
- No automated tests yet.

## Launch checklist (as of 2026-07-24)

**Blocking / in progress:**
- [ ] `supabase/add_polls_update_policy.sql` — must be run in the Supabase SQL editor. `polls` only ever had SELECT/INSERT RLS policies, never UPDATE, so `CreatePollModal`'s post-upload `polls.update({media_url, media_type})` call was silently affecting 0 rows (no error thrown — RLS just filtered it out). This file adds the missing `polls_update_own` policy and backfills the one poll ("Is this guy tuff or nah?", id `90c4a211-...`) that already had its file uploaded to Storage but no `media_url` set. **Unconfirmed whether the user has run this yet.**
- [ ] Google sign-in is throwing `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`. The code (`AuthContext.signInWithGoogle`, `AuthModal`'s Google button, `CompleteProfileModal`) is done and deployed, but in the Supabase dashboard the Google provider's enable toggle likely isn't actually saved as ON (Client ID/Secret may be filled in without the toggle flipped, or Save wasn't clicked). Needs to be re-checked and confirmed working end-to-end (redirect → `CompleteProfileModal` appears → username chosen → profile updates).

**Not yet tested:**
- [ ] Actual video upload + autoplay-on-scroll behavior — browser automation can't drive a native file picker, so only an image upload was tested (and that one hit the RLS bug above). Needs a real manual test: upload a short video, confirm it's muted+autoplays when scrolled into view, pauses when scrolled out, and the 🔇 tap-to-unmute button works.
- [ ] Image upload re-test after the RLS fix lands, to confirm new uploads attach correctly (not just the backfilled one).
- [ ] Real mobile device test (only simulated 375px viewport has been verified so far).

**Before treating this as production-ready:**
- [ ] Re-enable Supabase "Confirm email" (currently off for dev convenience — anyone can sign up with any email instantly right now).
- [ ] Test feed sort/filter/sidebar with a larger, more realistic number of polls.
- [ ] Consider automated tests (currently zero).

**Deferred by user choice, not blocking:**
- PWA vs native app wrapper — user chose to finish the responsive web app first before revisiting this.
