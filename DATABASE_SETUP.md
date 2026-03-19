# Database Setup Guide
**Project:** Monique D. Scott & Associates Attorneys-at-Law
**Supabase Project:** `https://efvnklokllobqsoripxy.supabase.co`

Complete these steps once to activate the Supabase backend.

---

## Step 1 — Run the SQL Schema

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → select the project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `scripts/schema.sql` from this repo and paste the entire contents
5. Click **Run**

This creates:
- `publications` table with all required columns
- `listings` table with all required columns
- Row Level Security (RLS) policies (public read, authenticated write)
- Indexes for fast slug/status/date lookups
- Auto-updating `updated_at` trigger

**Expected output:** `Success. No rows returned`

---

## Step 2 — Create Storage Buckets

Go to **Storage** in the left sidebar, then create three buckets:

### Bucket: `images`
- Click **New bucket**
- Name: `images`
- Toggle **Public bucket** → ON
- Click **Save**

### Bucket: `documents`
- Name: `documents`
- Public bucket: ON

### Bucket: `audio`
- Name: `audio`
- Public bucket: ON

> All three must be **public** so the frontend can display images and link to documents without requiring authentication.

---

## Step 3 — Create the Admin User

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click **Invite user**
3. Enter the admin email address (e.g. `moniquescottlaw@hotmail.com`)
4. Click **Send invitation**
5. The admin receives an email to set a password
6. Alternatively: Click **Add user** → **Create new user** and set email + password directly

> Only one admin user is needed. The admin can log in at `/admin` on the live site.

---

## Step 4 — Verify RLS Policies

In SQL Editor, run:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('publications', 'listings')
ORDER BY tablename, cmd;
```

Expected: 6 rows (2 tables × 3 policies each — SELECT public, ALL authenticated)

---

## Table Schemas Reference

### publications

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | Auto-generated PK |
| `title` | text | Required |
| `slug` | text | Unique URL identifier |
| `date` | date | Publication date |
| `category` | text | Legal Update, Newsletter, Firm News, Case Study, Client Advisory, Press Release |
| `status` | text | `published` or `draft` |
| `summary` | text | Short excerpt shown on grid |
| `body` | text | Full markdown content |
| `featured_image` | text | Supabase Storage public URL |
| `document_file` | text | Supabase Storage URL for downloadable PDF |
| `featured` | boolean | Pin to top of grid |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-updated on save |

### listings

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint | Auto-generated PK |
| `title` | text | Required |
| `slug` | text | Unique URL identifier |
| `listing_type` | text | `For Sale`, `For Rent`, `Land`, `Commercial` |
| `price` | text | Free-form (e.g. "JMD 12,500,000" or "Contact for price") |
| `location` | text | Street/area name |
| `parish` | text | Jamaica parish name |
| `status` | text | `available`, `pending`, `sold`, `draft` |
| `summary` | text | Short description for card view |
| `body` | text | Full markdown description |
| `featured_image` | text | Main listing photo URL |
| `gallery` | jsonb | Array of additional photo URLs `["url1","url2"]` |
| `featured` | boolean | Highlight listing |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-updated on save |

---

## RLS Policy Summary

| Table | Role | Operation | Condition |
|-------|------|-----------|-----------|
| publications | anon | SELECT | `status = 'published'` |
| publications | authenticated | ALL | always |
| listings | anon | SELECT | `status IN ('available', 'pending')` |
| listings | authenticated | ALL | always |

> **Draft publications and sold/draft listings are invisible to the public** — only the authenticated admin can see them via the dashboard.

---

## Quick Test After Setup

After running the schema and creating a user, test the integration:

1. Go to `/admin` on the live site
2. Log in with the admin credentials
3. Create a publication — set status to **Published**
4. Visit `/publications.html` — the card should appear
5. Click through to the single page — the content should render

If cards don't appear, check the browser console for Supabase errors.
