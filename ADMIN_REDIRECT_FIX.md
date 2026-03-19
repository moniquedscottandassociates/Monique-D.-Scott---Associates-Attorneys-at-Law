# Admin Redirect Loop — Root Cause & Fix
**Date:** 2026-03-19

---

## What Was Happening

Visiting `https://moniquedscottandassociates.com/admin` produced `ERR_TOO_MANY_REDIRECTS`.

### The Loop Chain

```
Browser: GET /admin
  │
  ├─ netlify.toml: from="/admin" → to="/admin/index.html" (status=200 proxy)
  │     Netlify proxies the content of /admin/index.html internally
  │
  ├─ Netlify built-in "strip index.html": any request that resolves to
  │     a path ending in /index.html is internally redirected (301) to
  │     the parent directory — so /admin/index.html → 301 → /admin/
  │
  ├─ /admin/ re-enters Netlify routing
  │     from="/admin" normalises trailing slash → rule matches again
  │     → proxy /admin/index.html → strip-index 301 → /admin/ → ...
  │
  └─ ∞ LOOP
```

### Why `force = false` Made It Worse

With `force = false`, Netlify only applies the redirect if no real file
exists at the path. Since `/admin` is a directory (not a file), the rule
fired regardless — but the directory flag also triggered Netlify's Pretty
URLs trailing-slash normalization, which added another redirect hop into
the same loop.

---

## Files Changed

### 1. `netlify.toml`

**Removed** the `from = "/admin"` → `"/admin/index.html"` (status 200) rule.

Netlify serves `/admin/` as a directory index automatically — no rule is
needed. When a user visits `/admin` (no trailing slash), Netlify's built-in
Pretty URLs does a single benign 301 redirect to `/admin/`, which then
serves `/admin/index.html` directly as a 200. One hop, no loop.

**Changed** the `/admin/dashboard` rule:
- `force = false` → `force = true` — ensures the rewrite always fires
  regardless of what's on disk at that path
- Status remains `200` (proxy rewrite) — safe because `dashboard.html` is
  not an `index.html` file, so Netlify's strip-index feature does not apply

### 2. `admin/index.html` — login page

Changed `window.location.href` → `window.location.replace` on both the
session-check redirect and the post-login redirect. `replace` removes the
current page from the browser history stack, preventing the back button
from creating a JS-level re-entry loop if someone navigates back.

### 3. `admin/dashboard.html` — dashboard

Same change: `window.location.href` → `window.location.replace` on both
the auth-guard redirect and the logout redirect.

---

## How the Final Routing Works

```
User visits /admin
  └─ Netlify Pretty URLs: 301 → /admin/
     └─ Netlify directory index: serve /admin/index.html (200) ✅

User visits /admin/ (trailing slash)
  └─ Netlify directory index: serve /admin/index.html (200) ✅

User visits /admin/dashboard (clean URL)
  └─ netlify.toml: from="/admin/dashboard" → /admin/dashboard.html (200, force=true) ✅

User visits /admin/index.html directly
  └─ Netlify strip-index: 301 → /admin/
     └─ Netlify directory index: serve /admin/index.html (200) ✅
        (One 301 hop, no loop — no proxy rule re-enters the cycle)

User visits /admin/dashboard.html directly
  └─ File exists → served as 200 ✅

Login page JS (successful login)
  └─ window.location.replace('/admin/dashboard.html') ✅

Dashboard JS (no session)
  └─ window.location.replace('/admin/') → directory index serves login ✅
```

---

## How to Test

### Locally (using Netlify CLI)
```bash
npm install -g netlify-cli
netlify dev
# Then visit http://localhost:8888/admin
# Should load login page — no redirect loop
```

### On Netlify after push
1. Push to `main` — Netlify auto-deploys
2. Wait for deploy to complete (Netlify dashboard → Deploys)
3. Visit `https://moniquedscottandassociates.com/admin`
4. Expected: login page loads normally
5. Log in → should land on `/admin/dashboard.html`
6. Log out → should return to `/admin/` login page
7. Directly visit `/admin/dashboard` → should load dashboard (if logged in) or redirect to login

### Quick browser test
Open DevTools → Network tab → visit `/admin`:
- Should see at most ONE 301 redirect (from `/admin` → `/admin/`)
- Then a 200 for `/admin/index.html`
- No looping 301s

---

## What Was NOT Changed
- All Supabase auth logic (credentials, signIn, signOut, getSession)
- Admin dashboard CRUD functionality
- Public site pages (index.html, publications.html, listings.html, etc.)
- Security headers
- Netlify Forms setup
- Any CSS or JS outside the two admin files
