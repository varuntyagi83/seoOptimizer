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

export interface AIRecommendations {
  siteWide: Recommendation[]
  critical: Recommendation[]
  important: Recommendation[]
  enhancements: Recommendation[]
  quickWins: Recommendation[]
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
