# Netlify Setup Guide
**Project:** Monique D. Scott & Associates Attorneys-at-Law
**GitHub Repo:** `moniquedscottandassociates/Monique-D.-Scott---Associates-Attorneys-at-Law`
**Netlify Site:** `moniquedscottandassociates.netlify.app`
**Live Domain:** `moniquedscottandassociates.com`

---

## Deployment Connection

| Item | Value | Status |
|------|-------|--------|
| GitHub remote | `https://github.com/moniquedscottandassociates/...` | ✅ Confirmed |
| Netlify publish dir | `.` (repo root) | ✅ In netlify.toml |
| Build command | None (plain static HTML) | ✅ Correct |
| Auto-deploy trigger | Push to `main` branch | ✅ Active |
| Deploy preview | PRs create preview URLs | ✅ Default Netlify behaviour |

Every `git push origin main` automatically triggers a Netlify deploy. No manual steps needed.

---

## netlify.toml Summary

```toml
[build]
  publish = "."           # Serve from repo root

[[redirects]]
  /admin          → /admin/index.html     (200 — clean URL for admin login)
  /admin/dashboard → /admin/dashboard.html (200 — clean URL for dashboard)
  /thank-you      → /                     (302 — post-form redirect)

[[headers]]
  /*              → X-Frame-Options: SAMEORIGIN
                    X-Content-Type-Options: nosniff
                    Referrer-Policy: strict-origin-when-cross-origin
  /admin/config.yml → Content-Type: text/yaml (required for Decap CMS)
  /assets/vendors/* → Cache-Control: max-age=31536000 (1 year)
```

---

## Forms Setup

Two Netlify Forms are configured. After the **first deploy**, configure email notifications:

### Contact Form (`contact`)
1. Netlify Dashboard → **Forms**
2. Click the `contact` form
3. **Settings** → **Form notifications** → **Add notification** → Email
4. To: `moniquescottlaw@hotmail.com`
5. Subject: `New Legal Enquiry – {{ case-type }}`
6. Repeat for `moniquedscottandassociates@gmail.com`

### Client Intake Form (`intake`)
1. Click the `intake` form
2. Add email notification to `moniquescottlaw@hotmail.com`
3. Subject: `New Client Intake – {{ case-type }}`

> Forms are submitted via AJAX with inline success messages — no page redirect occurs.

---

## Custom Domain

The domain `moniquedscottandassociates.com` is managed through FLOW Business DNS.

| DNS Record | Type | Value |
|-----------|------|-------|
| `@` | A | `75.2.60.5` |
| `www` | CNAME | `moniquedscottandassociates.netlify.app` |

SSL is automatically provisioned by Netlify (Let's Encrypt). No manual certificate management needed.

---

## Admin Panel Access

The admin panel lives at `/admin` (redirects to `/admin/index.html`):

- **Live URL:** `https://moniquedscottandassociates.com/admin`
- **Protected by:** Supabase Auth (email + password)
- **Indexed by search engines:** No (`<meta name="robots" content="noindex, nofollow">`)

---

## Decap CMS (Optional)

A Decap CMS config is present at `/admin/config.yml`. This is a secondary editing interface that writes content directly to GitHub.

**It is not the primary CMS.** The primary CMS is the custom admin dashboard at `/admin/dashboard.html` which uses Supabase.

Decap CMS requires a GitHub OAuth app to be configured in Netlify → Site Settings → Access control → OAuth → GitHub. This step is optional and only needed if you want to use the Decap interface.

---

## Deployment SOP

Refer to `DEPLOYMENT-SOP.md` for the full deployment checklist.

**Quick deploy:**
```bash
git add .
git commit -m "Your message"
git push origin main
# Netlify deploys automatically — monitor at netlify.com/sites
```

---

## Environment Variables

No build-time environment variables are required. Supabase credentials are embedded directly in the client-side JS (anon key — safe to expose).

If you ever add server-side functions (Netlify Functions), store the Supabase `service_role` key as:

- Netlify Dashboard → Site settings → Environment variables
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- **Never commit this key to GitHub**
