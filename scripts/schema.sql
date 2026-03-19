-- ============================================================
-- Monique D. Scott & Associates — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Publications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publications (
  id             bigint         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title          text           NOT NULL,
  slug           text           NOT NULL UNIQUE,
  date           date           NOT NULL DEFAULT CURRENT_DATE,
  category       text           NOT NULL DEFAULT 'Firm News',
  status         text           NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('published', 'draft')),
  summary        text,
  body           text,
  featured_image text,
  document_file  text,
  featured       boolean        NOT NULL DEFAULT false,
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Listings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id             bigint         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title          text           NOT NULL,
  slug           text           NOT NULL UNIQUE,
  listing_type   text           NOT NULL DEFAULT 'For Sale'
                                CHECK (listing_type IN ('For Sale', 'For Rent', 'Land', 'Commercial')),
  price          text,
  location       text,
  parish         text,
  status         text           NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available', 'pending', 'sold', 'draft')),
  summary        text,
  body           text,
  featured_image text,
  gallery        jsonb          NOT NULL DEFAULT '[]'::jsonb,
  featured       boolean        NOT NULL DEFAULT false,
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────

-- Enable RLS on both tables (blocks all access by default)
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings     ENABLE ROW LEVEL SECURITY;

-- Public read: only published publications
CREATE POLICY "Public can read published publications"
  ON publications FOR SELECT
  USING (status = 'published');

-- Public read: available and pending listings (sold is hidden)
CREATE POLICY "Public can read available listings"
  ON listings FOR SELECT
  USING (status IN ('available', 'pending'));

-- Authenticated users: full access to publications
CREATE POLICY "Authenticated users have full access to publications"
  ON publications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users: full access to listings
CREATE POLICY "Authenticated users have full access to listings"
  ON listings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS publications_slug_idx   ON publications (slug);
CREATE INDEX IF NOT EXISTS publications_status_idx ON publications (status);
CREATE INDEX IF NOT EXISTS publications_date_idx   ON publications (date DESC);
CREATE INDEX IF NOT EXISTS listings_slug_idx       ON listings (slug);
CREATE INDEX IF NOT EXISTS listings_status_idx     ON listings (status);
CREATE INDEX IF NOT EXISTS listings_type_idx       ON listings (listing_type);

-- ── Verification ──────────────────────────────────────────────
-- Run these queries to confirm setup:
-- SELECT * FROM publications LIMIT 5;
-- SELECT * FROM listings LIMIT 5;
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('publications', 'listings');
