# PollHub — AI Coding Guidelines (Codex Reference)

> This document defines the structure, rules, and patterns that AI coding tools (Codex)
> must follow when working on the PollHub project.
> All new features, bug fixes, and refactoring must comply with this document.

---

## 1. Project Overview

| Item | Details |
|---|---|
| App Name | PollHub |
| Description | Reddit-style community polling platform |
| Frontend | React 18 + Vite |
| Backend / DB | Supabase (PostgreSQL) |
| Styling | CSS Modules (global variables in index.css) |
| Routing | React Router v6 |
| Auth | Supabase Auth (email + password) |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## 2. Directory Structure

```
pollhub/
├── index.html
├── vite.config.js
├── package.json
├── .env                          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
└── src/
    ├── main.jsx                  # ReactDOM.createRoot, wraps BrowserRouter
    ├── App.jsx                   # Route definitions only
    ├── index.css                 # Global CSS variable definitions (:root)
    │
    ├── lib/
    │   ├── supabase.js           # Supabase client singleton
    │   └── AuthContext.jsx       # useAuth() hook + AuthProvider
    │
    ├── components/
    │   ├── Header.jsx            # Top nav, login/logout, + New Poll button
    │   ├── Header.module.css
    │   ├── AuthModal.jsx         # Login + signup modal
    │   ├── CreatePollModal.jsx   # Poll creation modal
    │   ├── PollCard.jsx          # Feed poll card (vote, share, comment toggle)
    │   ├── PollCard.module.css
    │   ├── CommentSection.jsx    # Comment list + input form
    │   ├── CommentSection.module.css
    │   └── Modal.module.css      # Shared styles for AuthModal + CreatePollModal
    │
    └── pages/
        ├── Feed.jsx              # Main feed page (sort, filter, sidebar)
        ├── Feed.module.css
        ├── PollPage.jsx          # Individual poll page at /poll/:id
        └── PollPage.module.css
```

---

## 3. Database Schema

### Table Definitions

```sql
-- User profile (1:1 with auth.users)
profiles (
  id          uuid  PRIMARY KEY references auth.users,
  username    text  UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now()
)

-- Poll posts
polls (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  question    text  NOT NULL,
  category    text  NOT NULL DEFAULT 'other',
  author_id   uuid  references profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
)

-- Poll answer options
options (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid  references polls(id) ON DELETE CASCADE,
  label       text  NOT NULL,
  position    int   NOT NULL DEFAULT 0
)

-- Vote records (one vote per user per poll enforced at DB level)
votes (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid  references polls(id) ON DELETE CASCADE,
  option_id   uuid  references options(id) ON DELETE CASCADE,
  user_id     uuid  references profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)        -- Critical: prevents duplicate votes at DB level
)

-- Comments
comments (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid  references polls(id) ON DELETE CASCADE,
  author_id   uuid  references profiles(id) ON DELETE CASCADE,
  body        text  NOT NULL,
  created_at  timestamptz DEFAULT now()
)
```

### Row Level Security (RLS) Policies

```sql
-- All tables: anyone can read
-- Writes: users can only modify their own data
polls    INSERT: auth.uid() = author_id
votes    INSERT: auth.uid() = user_id
comments INSERT: auth.uid() = author_id
options  INSERT: any authenticated user (inserted together with poll creation)
```

### New User Trigger

```sql
-- Auto-creates a profile row when a user signs up via Supabase Auth
CREATE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

> **Note:** The trigger may not fire before email confirmation.
> The signUp() function in AuthContext.jsx manually upserts the profile
> immediately after auth.signUp() as a fallback.

---

## 4. Core Patterns — Always Follow These

### 4-1. Supabase Query Patterns

```js
// ✅ Correct — use maybeSingle() so missing rows return null, not an error
const { data } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', username)
  .maybeSingle()

// ❌ Forbidden — single() throws an error when no row is found
const { data } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', username)
  .single()   // crashes if row doesn't exist
```

```js
// ✅ How to parse Supabase aggregate (count) results
// Supabase returns count as [{count: N}], not a plain number
const voteCount = option.vote_count?.[0]?.count ?? 0

// ✅ Relational query (join) pattern
const { data } = await supabase
  .from('polls')
  .select(`
    id, question, category, created_at,
    profiles(username),
    options(id, label, position, vote_count:votes(count)),
    comment_count:comments(count)
  `)
```

```js
// ✅ Upsert pattern (safe insert — ignores conflict)
await supabase
  .from('profiles')
  .upsert({ id: userId, username }, { onConflict: 'id' })
```

### 4-2. Auth Patterns

```js
// ✅ Always get auth state via the useAuth() hook
import { useAuth } from '../lib/AuthContext.jsx'
const { user, profile, loading, signIn, signUp, signOut } = useAuth()

// ✅ Standard pattern for auth-gated actions
async function handleAction() {
  if (!user) { setShowAuth(true); return }
  // ... actual action
}

// ❌ Forbidden — never call supabase.auth directly inside components
const { data } = await supabase.auth.getUser()  // must go through AuthContext
```

### 4-3. Error Handling Pattern

```js
// ✅ All Supabase queries must use try/catch and show errors to the user
const [error, setError] = useState('')

try {
  const { error: dbErr } = await supabase.from('...').insert({...})
  if (dbErr) throw dbErr
} catch (err) {
  setError(err.message)   // show to user
  console.error(err)      // log for developer
}

// ❌ Forbidden — never silently ignore errors
const { error } = await supabase.from('...').insert({...})
// not checking error is not allowed
```

### 4-4. Component Patterns

```jsx
// ✅ Always handle loading, error, and empty states
if (loading) return <div className={styles.center}><span className="spinner" /></div>
if (error)   return <div className={styles.error}>{error}</div>
if (!data)   return <div>Not found</div>

// ✅ Modals must NOT close on overlay click — only via Cancel button
// Never add an onClick handler to the overlay div
<div className={styles.overlay}>    {/* no onClick here */}
  <div className={styles.modal}>
    ...
    <button onClick={onClose}>Cancel</button>
  </div>
</div>

// ✅ After any data mutation, always call onUpdate() to refresh the feed
const { error } = await supabase.from('votes').insert({...})
if (!error) onUpdate?.()
```

---

## 5. Validation Rules — Enforce on Both Frontend and DB

### Username
```js
if (username.length < 2)                  // minimum 2 characters
if (username.length > 24)                 // maximum 24 characters
if (!/^[a-zA-Z0-9_]+$/.test(username))   // letters, numbers, underscores only
// Always save as lowercase
const clean = username.toLowerCase().trim()
```

### Password
```js
if (pass.length < 8)          // minimum 8 characters
if (!/[a-zA-Z]/.test(pass))   // must contain at least one letter
if (!/[0-9]/.test(pass))      // must contain at least one number
```

### Poll
```js
if (!question.trim())                    // question is required
if (question.length > 200)               // max 200 characters
if (!CATEGORIES.includes(category))      // must pass whitelist check
if (filtered.length < 2)                 // minimum 2 options
if (filtered.length > 6)                 // maximum 6 options
// Each option: max 80 characters
```

### Comment
```js
if (!body.trim())        // empty comments not allowed
if (body.length > 500)   // max 500 characters
```

### Allowed Categories (Whitelist)
```js
const CATEGORIES = ['tech', 'life', 'finance', 'gaming', 'other']
// Any value outside this list must be rejected before DB insert
```

---

## 6. Security Rules — Never Violate These

```
1. OPTION OWNERSHIP CHECK
   Before inserting a vote, verify the optionId belongs to the current poll:
   poll.options.find(o => o.id === optionId)
   Never trust the client to send a valid optionId without this check.

2. LOWERCASE USERNAMES
   Always store usernames in lowercase.
   Prevents case-based impersonation (e.g. "Admin" vs "admin").

3. CATEGORY WHITELIST
   Always validate category against CATEGORIES array before DB insert.
   Never store raw user input as category.

4. DOUBLE ENFORCEMENT
   Auth-required actions must be blocked at both client level AND via Supabase RLS.
   Never rely solely on client-side checks.

5. NO SCHEMA LEAKING IN ERROR MESSAGES
   Never show raw DB errors to users (e.g. "relation 'profiles' does not exist").
   Show generic messages instead: "Something went wrong. Please try again."

6. NO HARDCODED SECRETS
   Environment variables (Supabase URL, anon key) must only exist in .env.
   Never hardcode them in source files.
```

---

## 7. CSS / Styling Rules

### CSS Variables (defined in index.css)

```css
/* Backgrounds */
--bg: #0d0d0f          /* darkest background */
--bg2: #161618         /* card background */
--bg3: #1e1e22         /* input, comment background */
--bg4: #252529         /* hover background */

/* Text */
--text: #f0f0f2        /* primary text */
--text2: #9898a6       /* secondary text */
--text3: #5a5a6a       /* hints, timestamps */

/* Brand Colors */
--accent: #7c6fff      /* primary purple */
--accent2: #a89fff     /* light purple */
--accent-bg: rgba(124,111,255,0.12)  /* vote result bar fill */
--green: #3ecf8e       /* success, checkmarks */
--red: #f87171         /* errors, delete */
--amber: #fbbf24       /* warnings */

/* Borders */
--border: rgba(255,255,255,0.07)    /* default border */
--border2: rgba(255,255,255,0.13)   /* emphasized border */

/* Misc */
--radius: 12px         /* card border radius */
--radius-sm: 8px       /* button, input border radius */
--font: 'DM Sans', sans-serif
--font-serif: 'DM Serif Display', serif
```

### Global Button Classes (not CSS Modules — applied globally)

```jsx
<button className="btn btn-accent">Primary Action</button>   // purple background
<button className="btn btn-ghost">Secondary Action</button>  // transparent
<button className="btn btn-sm">Small Button</button>         // smaller padding

// Loading spinner
<span className="spinner" />
```

### CSS Module Rules

```
- Every component has its own .module.css file
- Shared modal styles go in Modal.module.css
- Global styles only go in index.css
- Always create a .module.css file alongside any new component
- Never use inline styles for layout — only for dynamic values (e.g. widths from data)
- Always use CSS variables for colors — never hardcode hex values in components
```

---

## 8. Checklist for Adding New Features

Follow this order for every new feature:

```
[ ] 1. Add Supabase table / column if needed
[ ] 2. Add RLS policy for the new table
[ ] 3. Add frontend validation
[ ] 4. Write Supabase query (use maybeSingle, handle errors)
[ ] 5. Handle loading state
[ ] 6. Handle error state (display to user, not just console)
[ ] 7. Call onUpdate() or refresh state after successful mutation
[ ] 8. Add styles in CSS Module file using existing CSS variables
[ ] 9. Test on mobile (768px breakpoint — sidebar hides below this)
```

---

## 9. Route Structure

```
/              → Feed.jsx       (main poll feed)
/poll/:id      → PollPage.jsx   (individual poll detail)
```

### Adding a New Page

```jsx
// Step 1: Add Route in App.jsx
<Route path="/new-page" element={<NewPage />} />

// Step 2: Create files
src/pages/NewPage.jsx
src/pages/NewPage.module.css
```

---

## 10. Forbidden Patterns — Never Do These

```
❌ Use .single() — use .maybeSingle() instead
❌ Add onClick close handler to modal overlays
❌ Use alert() or confirm() — use inline error/state messages instead
❌ Hardcode environment variables in source code
❌ Skip category whitelist validation
❌ Allow DB writes without authentication check
❌ Use arbitrary color hex values — always use CSS variables
❌ Only log errors to console without showing them to the user
❌ Introduce TypeScript — this project is plain JavaScript
❌ Install new UI libraries (Tailwind, MUI, etc.) — keep CSS Modules
❌ Call supabase.auth methods directly in components — use AuthContext
```

---

## 11. Currently Implemented Features

```
✅ Email + password signup / login
✅ Case-insensitive username uniqueness check
✅ Password strength validation (8+ chars, letter, number)
✅ Email confirmation flow handling
✅ Manual profile upsert fallback on signup
✅ Poll creation (question, category, 2–6 options)
✅ Voting (one vote per poll, duplicate prevention at DB + client level)
✅ Vote result visualization (% bar graph)
✅ Sort modes: Hot / New / Top
✅ Category filter dropdown
✅ Comment creation and display
✅ Poll sharing (URL copy, SNS share buttons)
✅ Individual poll page (/poll/:id)
✅ Sidebar: live stats + trending TOP 5
✅ Responsive layout (sidebar hidden below 768px)
✅ Error states for feed, comments, and all forms
✅ Auth modal opens instead of alert() when unauthenticated user tries to vote
```

---

## 12. Planned Features (Not Yet Implemented)

```
⬜ Referral code system (influencer traffic tracking)
⬜ Photo attachment on polls (Supabase Storage)
⬜ Follow / friend system
⬜ User profile page (my polls, my votes)
⬜ Real-time vote updates (Supabase Realtime)
⬜ Notification system
⬜ Poll reporting / moderation
⬜ Admin dashboard
⬜ Premium plan / monetization
```

---

## 13. Environment Setup

### Required Environment Variables (.env)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Local Development
```bash
npm install
npm run dev       # runs at http://localhost:5173
```

### Build & Deploy
```bash
npm run build     # outputs to dist/
npm run preview   # preview the build locally
# Vercel auto-deploys from the dist/ folder
```

---

## 14. How to Give Tasks to Codex

Always start your Codex prompt with:

```
Read the attached POLLR_CODEX_GUIDE.md fully before writing any code.
All decisions must follow the rules in that document.
Do not install new libraries. Do not use TypeScript.
Do not use .single() — use .maybeSingle().
Do not add onClick to modal overlays.

Task: [describe what you want here]
```

---

*This document is the Single Source of Truth for the PollHub project.*
*Update this document whenever a new feature is added or a rule changes.*
