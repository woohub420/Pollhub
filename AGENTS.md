# PollHub

Read `POLLHUB_CODEX_GUIDE.md` fully before writing any code — it is the single source of truth for architecture, patterns, validation rules, and forbidden patterns.

Always start every prompt with:
```
Read POLLHUB_CODEX_GUIDE.md fully before writing any code.
Follow all rules in that document.
Do not install new libraries. Do not use TypeScript.
Do not use .single() — use .maybeSingle().
Do not embed poll_media in PostgREST select — use two-step fetch.
For polls table, use author_id not user_id.
Run sanitize() on all user text before DB insert.
Call checkRateLimit() before all mutations.
```

---

## Current Status

- **Production URL:** https://pollhub-mu.vercel.app/
- **GitHub:** woohub420/Pollhub (auto-deploys on push to main)
- **Supabase project:** vrqwvipfcjdlqgycnhof
- **Contact:** ypmedia.contact@gmail.com

---

## What's Built and Working

### Auth
- Email + password signup/login with Cloudflare Turnstile bot protection
- Google OAuth login (fully working)
- Email verification required on signup
- CompleteProfileModal for Google users (forces username selection)
- Ban system — banned users blocked on login + all mutations via RLS
- Account deletion (server-side via api/delete-account.js)
- Password change via /settings

### Polls
- Create polls (question, optional description, 2–6 options)
- Searchable category selector (user-created communities)
- Poll expiry (never / 1h / 6h / 24h / 3d / 7d)
- Vote-to-see results toggle
- Multi-media: up to 4 images (carousel) or 1 video
- Voting with realtime updates (no page refresh)
- Likes with realtime updates
- Native share (mobile) + dropdown (desktop)
- Report polls and comments

### Feed
- All / Following tabs
- Sort: Hot / New / Top
- Category filter dropdown
- Sidebar: Live Stats, Trending TOP 5, Your Communities, + Create Community

### Social
- Follow / unfollow users
- Public user profiles (/u/:username)
- User-created categories + category pages (/c/:slug)
- Category follow system

### Comments
- Threaded replies (1 level deep, Instagram-style)
- Report button on comments and replies
- Admin can delete comments

### Notifications
- Bell icon with realtime updates + unread badge
- Types: vote, like, follow, comment, reply
- 7-day auto-hide
- Per-type toggle settings in /settings

### Search
- Header autocomplete (polls, users, categories — 250ms debounce)
- Full search page (/search) with tabs

### Settings (/settings)
- Account tab: change password, delete account
- Notifications tab: per-type toggles
- Appearance tab: light/dark mode toggle

### Admin (/admin)
- View pending/resolved/dismissed reports
- Delete polls and comments
- Ban/unban users
- Banned users tab

### Other
- 404 page
- Terms of Service (/terms)
- Privacy Policy (/privacy) — PIPEDA compliant
- Bug report link in footer (mailto:ypmedia.contact@gmail.com)
- PostHog analytics
- vercel.json SPA routing

---

## Security Completed

- Supabase RLS on all tables
- DB trigger: prevents self-promotion to admin / self-unban
- DB trigger: vote option_id must belong to poll_id
- options INSERT: only poll author can add options
- poll_views SELECT: only poll owner can see viewer identities
- polls.category: FK to categories(name) — no arbitrary strings
- Rate limiting (client-side + server-side IP limit)
- XSS sanitization via DOMPurify on all user text
- Cloudflare Turnstile on login/signup
- poll-media bucket: 20MB limit, restricted MIME types
- Email verification required

---

## Known Gaps / Not Yet Done

- sanitize() not applied to CreateCategoryModal description or ReportModal note (low risk — no dangerouslySetInnerHTML in codebase)
- avatars bucket policy not committed to migration file (manually configured in dashboard)
- No automated tests
- OG meta tags for link previews not yet built
- Recommendation algorithm / event tracking not yet built
- PWA / push notifications not yet built

---

## Architecture Notes

- `polls.author_id` — NOT `user_id`. Always use `author_id` for the polls table.
- `poll_media` must always be fetched in a separate query and merged manually (PostgREST relationship embedding is unreliable — see POLLHUB_CODEX_GUIDE.md section 4-1)
- Theme (dark/light) is stored in `profiles.theme` and applied via `document.documentElement.setAttribute('data-theme', theme)` in AuthContext
- Banned users: `profiles.is_banned = true` → AuthContext signs them out on login; RLS policies block all mutations
- Admin flag: `profiles.is_admin = true` → DB trigger prevents non-admins from changing this column

---

## Environment Variables

```
# Public (VITE_ prefix — safe for browser)
VITE_SUPABASE_URL=https://vrqwvipfcjdlqgycnhof.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAD_rIZ3ceF1tK2SE
VITE_POSTHOG_KEY=phc_sy6uR2QLDPQ3cEv9cnTjRXXYzPYtYmKQ4p56xFpgPAfP
VITE_POSTHOG_HOST=https://us.i.posthog.com

# Secret (Vercel env vars only — NEVER VITE_ prefix)
TURNSTILE_SECRET_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Local Setup

```bash
git clone https://github.com/woohub420/Pollhub.git
cd Pollhub
npm install
# Create .env with public vars above
npm run dev   # http://localhost:5173
```

Note: `/api/*` endpoints (Turnstile verify, account deletion) only work via `vercel dev` or on the deployed Vercel URL — not with plain `npm run dev`.
