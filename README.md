# Monique D. Scott & Associates — Attorneys-at-Law

Static website for **Monique D. Scott & Associates Attorneys-at-Law**, Port Antonio, Portland, Jamaica.
Live domain: [moniquedscottandassociates.com](https://moniquedscottandassociates.com)

---

## Project Structure

```
index.html          ← Main (and only) page
assets/
  css/              ← Stylesheets (mds-custom.css is the brand override)
  js/               ← Scripts (procounsel.js is the main script)
  images/           ← All images, logos, favicons
  vendors/          ← Third-party JS libraries (bundled locally)
netlify.toml        ← Netlify build/redirect/header config
.gitignore          ← Excludes server.js, .claude/, internal docs
```

---

## Local Preview

No build step is required — this is a plain static site.

**Option A — Node.js (bundled server)**
```bash
node server.js
# Open http://localhost:3000
```

**Option B — VS Code Live Server extension**
Right-click `index.html` → _Open with Live Server_

**Option C — Python (no install needed on most systems)**
```bash
python -m http.server 8080
# Open http://localhost:8080
```

> Note: `server.js` is excluded from the production repo via `.gitignore` — it is for local preview only.

---

## GitHub — First Push

Run these commands in your terminal from the project folder:

```bash
# 1. Initialise the repo
git init

# 2. Stage all production files
git add .

# 3. First commit
git commit -m "Initial commit — Monique D. Scott & Associates website"

# 4. Create the main branch
git branch -M main

# 5. Connect to your GitHub repo (replace the URL with your own)
git remote add origin https://github.com/YOUR-USERNAME/monique-dscott-associates.git

# 6. Push
git push -u origin main
```

> Create the GitHub repo first at https://github.com/new — set it to **Private**, no README, no .gitignore.

---

## Netlify Deployment

### Via GitHub (recommended — auto-deploys on every push)

1. Log in to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** and authorise Netlify
4. Select your repo (`monique-dscott-associates`)
5. Build settings:
   - **Build command:** _(leave blank)_
   - **Publish directory:** `.` (a single dot — the root)
6. Click **Deploy site**

Netlify will detect `netlify.toml` automatically — no extra config needed.

### Contact Form (Netlify Forms)

The contact form uses `data-netlify="true"` and submits via AJAX — a success message is shown inline without a page reload.

**After the first deploy, do the following in Netlify:**

1. Go to **Netlify → Your site → Forms**
   You should see a form named **`contact`** listed automatically.

2. Go to **Forms → Form notifications → Add notification → Email notification**
   - **Email to notify:** `moniquescottlaw@hotmail.com` (repeat for the second address if needed)
   - **Custom email subject:** `New Legal Enquiry – {{ case-type }}`
     _(This inserts the selected "Case Type" from the form into the subject line)_

3. Click **Save**.

**Form fields and how they appear in the email notification:**

| Form field | Netlify label in email |
|---|---|
| `client-name` | Client Name |
| `client-email` | Client Email |
| `client-phone` | Client Phone |
| `case-type` | Case Type |
| `client-message` | Client Message |

No PHP, no external service, no secrets required.

> **Note:** Netlify detects the form during the first deployment by scanning `index.html` for `data-netlify="true"`. The form will **not** appear in the Forms tab until the first successful deploy.

---

## Custom Domain — FLOW Business DNS

After deploying on Netlify:

1. In Netlify: go to **Site settings → Domain management → Add custom domain**
2. Enter `moniquedscottandassociates.com` and click **Verify**
3. Log in to your **FLOW Business** DNS management portal
4. Update the DNS records as follows:

| Type  | Name | Value                          |
|-------|------|--------------------------------|
| A     | @    | `75.2.60.5`                    |
| CNAME | www  | `[your-netlify-subdomain].netlify.app` |

> Netlify's load-balancer IP for the A record is `75.2.60.5`.
> DNS propagation typically takes 15 minutes to 48 hours.

5. Back in Netlify, click **Verify DNS** once records have propagated
6. Enable **HTTPS (Let's Encrypt)** — Netlify provisions the SSL certificate automatically

---

## Notes

- `server.js` is for **local preview only** — excluded from git, not deployed
- Contact form submissions are handled by **Netlify Forms** — no PHP, no backend required
- All asset paths are relative — the site works from the root directory on any static host
- Form submissions are sent to Monique's email via Netlify form notifications (configure after first deploy)
