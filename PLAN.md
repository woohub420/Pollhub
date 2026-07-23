# PollHub — Build Plan

## Context

The project folder currently contains only `POLLHUB_CODEX_GUIDE.md`, a spec/rules document for a Reddit-style polling app (React 18 + Vite + Supabase). No code exists yet. The goal is to build the full MVP described in the guide's "Currently Implemented Features" list (section 11): auth, poll creation/voting, comments, feed sort/filter, sharing, sidebar stats, and responsive layout — following every pattern and rule the guide specifies (query patterns, security rules, CSS conventions, forbidden patterns).

Since there's no Supabase project yet, the plan produces the schema as SQL files for the user to run manually in the Supabase SQL editor, plus a `.env.example` — the app will scaffold and build correctly but won't load real data until the user creates a project and fills in `.env`.

## Approach

Build in dependency order: scaffold → styling foundation → Supabase/auth plumbing → shared components → pages → wiring. This mirrors the guide's own directory structure (section 2) exactly so future edits match what the guide documents.

### 1. Scaffold
- `npm create vite@latest . -- --template react` (React 18, plain JS, not TS — per rule 10)
- Install deps: `react-router-dom`, `@supabase/supabase-js`
- Create `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` placeholders (real `.env` is gitignored, user fills in after creating their Supabase project)

### 2. Database schema (SQL files, not executed by me)
Create `supabase/schema.sql` containing, in order:
- Table definitions exactly as in guide section 3 (`profiles`, `polls`, `options`, `votes`, `comments`), including the `UNIQUE(poll_id, user_id)` constraint on votes
- RLS policies (read-all, write-own) per section 3
- `handle_new_user()` trigger function + `on_auth_user_created` trigger
Provide the user a short README note on running this in the Supabase SQL editor after project creation.

### 3. Global styling foundation
- `src/index.css`: all CSS variables from guide section 7 (`--bg`, `--bg2`...`--bg4`, `--text`/`--text2`/`--text3`, `--accent`/`--accent2`/`--accent-bg`, `--green`/`--red`/`--amber`, `--border`/`--border2`, `--radius`/`--radius-sm`, fonts), plus global `.btn`, `.btn-accent`, `.btn-ghost`, `.btn-sm`, `.spinner` classes
- `src/main.jsx`: `ReactDOM.createRoot`, wraps `<BrowserRouter>` + `<AuthProvider>`

### 4. Supabase & Auth layer
- `src/lib/supabase.js`: single `createClient` export using `import.meta.env.VITE_SUPABASE_URL/ANON_KEY`
- `src/lib/AuthContext.jsx`: `AuthProvider` + `useAuth()` hook exposing `{ user, profile, loading, signIn, signUp, signOut }`
  - `signUp()`: calls `supabase.auth.signUp`, then manually upserts profile (fallback for pre-confirmation trigger timing, per guide's documented note) using the upsert pattern from section 4-1
  - Username normalization: lowercase + trim before any write (rule 6-2)
  - All other components must consume auth only via this hook — never call `supabase.auth.*` directly elsewhere (rule 10)

### 5. Shared components (`src/components/`)
Each gets its own `.module.css`; `Modal.module.css` holds styles shared by the two modals.
- `Header.jsx` — top nav, login/logout, "+ New Poll" button (opens `CreatePollModal`, or `AuthModal` if signed out)
- `AuthModal.jsx` — login + signup, client-side validation from guide section 5 (username 2–24 chars `[a-zA-Z0-9_]`, password 8+ chars with letter+number), overlay has no `onClick` close handler (rule 10)
- `CreatePollModal.jsx` — question (≤200 chars), category (whitelist dropdown from `CATEGORIES`), 2–6 options (≤80 chars each); inserts poll + options together, calls `onUpdate()` after success
- `PollCard.jsx` — renders one poll in the feed: options with % bar (using `--accent-bg` fill), vote handler that (a) requires auth, (b) verifies `optionId` belongs to the poll before insert (rule 6-1), share buttons (URL copy + SNS), toggle for `CommentSection`
- `CommentSection.jsx` — list + input form, ≤500 chars, empty-comment rejection, auth-gated submit

### 6. Pages (`src/pages/`)
- `Feed.jsx` — main feed: sort modes (Hot/New/Top), category filter dropdown, sidebar (live stats + trending TOP 5), responsive (sidebar hidden <768px per rule 8-9)
- `PollPage.jsx` — single poll at `/poll/:id`, reuses `PollCard` + `CommentSection`, fetches via the relational-select pattern from guide section 4-1 (joined `profiles`, `options` with `vote_count`, `comment_count`)

### 7. App shell & routing
- `src/App.jsx` — route definitions only: `/` → `Feed`, `/poll/:id` → `PollPage`
- Wire `Header` to render on every route (in `main.jsx` or a layout wrapper, whichever keeps `App.jsx` route-only per rule 2)

### 8. Cross-cutting rules applied everywhere (from guide sections 4, 5, 6, 10)
- Every Supabase read uses `.maybeSingle()`, never `.single()`
- Every mutation wrapped in try/catch: `setError(err.message)` shown to user + `console.error` logged — but user-facing error text is a generic message ("Something went wrong...") rather than the raw DB error (rule 6-5), so components map/catch before setting error state
- Every component handles loading / error / empty states explicitly
- Category values validated against `CATEGORIES` whitelist client-side before every poll insert
- No `alert()`/`confirm()` anywhere; no inline hex colors; no new UI libraries; no TypeScript

## Files to be created

```
.env.example
supabase/schema.sql
index.html, vite.config.js, package.json  (from scaffold)
src/main.jsx
src/App.jsx
src/index.css
src/lib/supabase.js
src/lib/AuthContext.jsx
src/components/Header.jsx + .module.css
src/components/AuthModal.jsx
src/components/CreatePollModal.jsx
src/components/PollCard.jsx + .module.css
src/components/CommentSection.jsx + .module.css
src/components/Modal.module.css
src/pages/Feed.jsx + .module.css
src/pages/PollPage.jsx + .module.css
```

## Verification

1. `npm run dev` — app boots at localhost:5173 with no console errors (Supabase calls will fail gracefully with the "no env vars" case until the user fills in `.env` — will surface as a friendly error state, not a crash)
2. Walk through in the in-app browser once `.env` is filled and `schema.sql` is run:
   - Sign up → profile auto-created (lowercase username enforced)
   - Create a poll (2–6 options, whitelisted category)
   - Vote once, confirm duplicate vote is blocked (DB `UNIQUE` + client check)
   - Open `/poll/:id`, add a comment, confirm it appears
   - Toggle sort modes and category filter on the feed
   - Resize to <768px, confirm sidebar hides
3. Confirm forbidden patterns are absent: grep for `.single(`, `alert(`, `confirm(`, `supabase.auth.` outside `AuthContext.jsx`
