import type { CrawlConfig } from './crawler'

export interface CheckItem {
  tag: string
  status: 'pass' | 'warning' | 'fail'
  found: string
  recommendation: string | null
  weight: number
}

export interface PageAnalysis {
  url: string
  depth: number
  scores: { overall: number; seo: number; aeo: number }
  meta: CheckItem[]
  content: CheckItem[]
  technical: CheckItem[]
  aeo: CheckItem[]
}

export interface SiteIssue {
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  affectedPages: string[]
  count: number
  recommendation: string
}

export interface Recommendation {
  title: string
  description: string
  action: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  affectedPages?: string[]
  codeSnippet?: string
}

export interface PageRecommendation {
  url: string
  priority: number  // 1 = highest priority
  scoreBreakdown: { seo: number; aeo: number; overall: number }
  topIssues: string[]
  fixes: string[]
}

export interface ExecutiveSummary {
  narrative: string                  // 2-3 sentence overview
  scoreContext: string               // what the score means + path to 90+
  biggestWin: string                 // single most impactful action
}

export interface AIRecommendations {
  executiveSummary: ExecutiveSummary
  siteWide: Recommendation[]
  critical: Recommendation[]
  important: Recommendation[]
  enhancements: Recommendation[]
  quickWins: Recommendation[]
  pageSpecific: PageRecommendation[]
}

export interface SiteAnalysis {
  id: string
  domain: string
  startUrl: string
  crawlConfig: CrawlConfig
  crawledAt: Date
  completedAt: Date
  scores: { overall: number; seo: number; aeo: number }
  pages: PageAnalysis[]
  siteWideIssues: {
    critical: SiteIssue[]
    warnings: SiteIssue[]
    opportunities: SiteIssue[]
  }
  stats: {
    totalPages: number
    avgLoadTime: number
    pagesWithoutH1: number
    pagesWithoutDescription: number
    imagesWithoutAlt: number
    pagesWithStructuredData: number
    pagesWithFaqSchema: number
  }
  aiRecommendations?: AIRecommendations
}
