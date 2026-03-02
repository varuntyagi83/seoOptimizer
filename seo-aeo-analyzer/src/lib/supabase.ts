import { createClient } from '@supabase/supabase-js'
import type { SiteAnalysis } from '@/types/analysis'

// ── Browser client (uses anon key) ────────────────────────────────────────────
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// ── Server client (uses service role key — never exposed to browser) ──────────
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_KEY!
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// ── Database helpers ──────────────────────────────────────────────────────────

export interface SavedAnalysis {
  id: string
  user_id: string | null
  domain: string
  start_url: string
  overall_score: number
  seo_score: number
  aeo_score: number
  pages_crawled: number
  stats: SiteAnalysis['stats']
  site_wide_issues: SiteAnalysis['siteWideIssues']
  ai_recommendations: SiteAnalysis['aiRecommendations'] | null
  created_at: string
}

export async function saveAnalysis(
  analysis: SiteAnalysis,
  userId?: string
): Promise<{ id: string } | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('site_analyses')
    .insert({
      user_id: userId ?? null,
      domain: analysis.domain,
      start_url: analysis.startUrl,
      overall_score: analysis.scores.overall,
      seo_score: analysis.scores.seo,
      aeo_score: analysis.scores.aeo,
      pages_crawled: analysis.stats.totalPages,
      stats: analysis.stats,
      site_wide_issues: analysis.siteWideIssues,
      ai_recommendations: analysis.aiRecommendations ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Supabase] saveAnalysis error:', error.message)
    return null
  }

  return { id: data.id }
}

export async function getAnalysisHistory(
  userId: string,
  limit = 20
): Promise<SavedAnalysis[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('site_analyses')
    .select('id, domain, start_url, overall_score, seo_score, aeo_score, pages_crawled, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Supabase] getAnalysisHistory error:', error.message)
    return []
  }

  return data as SavedAnalysis[]
}

export async function getAnalysisById(id: string): Promise<SavedAnalysis | null> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('site_analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Supabase] getAnalysisById error:', error.message)
    return null
  }

  return data as SavedAnalysis
}
