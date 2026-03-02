-- SEO & AEO Analyzer — Supabase Schema
-- Run this in the Supabase SQL Editor

-- ── site_analyses table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_analyses (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  domain             TEXT        NOT NULL,
  start_url          TEXT        NOT NULL,
  overall_score      INTEGER     NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  seo_score          INTEGER     NOT NULL CHECK (seo_score BETWEEN 0 AND 100),
  aeo_score          INTEGER     NOT NULL CHECK (aeo_score BETWEEN 0 AND 100),
  pages_crawled      INTEGER     NOT NULL DEFAULT 0,
  stats              JSONB       NOT NULL DEFAULT '{}',
  site_wide_issues   JSONB       NOT NULL DEFAULT '{}',
  ai_recommendations JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS site_analyses_user_id_idx     ON site_analyses (user_id);
CREATE INDEX IF NOT EXISTS site_analyses_domain_idx      ON site_analyses (domain);
CREATE INDEX IF NOT EXISTS site_analyses_created_at_idx  ON site_analyses (created_at DESC);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE site_analyses ENABLE ROW LEVEL SECURITY;

-- Users can read their own analyses
CREATE POLICY "Users can view own analyses"
  ON site_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
  ON site_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
  ON site_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (for server-side saves without auth)
CREATE POLICY "Service role full access"
  ON site_analyses FOR ALL
  USING (auth.role() = 'service_role');
