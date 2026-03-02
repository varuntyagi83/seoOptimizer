export interface CrawlConfig {
  startUrl: string
  maxPages: number           // 10, 25, 50, 100
  maxDepth: number           // 1, 2, 3
  respectRobotsTxt: boolean
  includeSitemap: boolean
  concurrency: number        // default 3
  timeout: number            // default 15000ms
}

export interface CrawlJob {
  url: string
  depth: number
  priority: number           // lower = higher priority
  parentUrl: string | null
  status: 'pending' | 'crawling' | 'complete' | 'failed'
  retries: number
  error?: string
}

export interface CrawlProgress {
  total: number
  completed: number
  failed: number
  currentUrl: string | null
  pagesPerSecond: number
  estimatedTimeRemaining: number
}

export interface CrawledPage {
  url: string
  finalUrl: string
  statusCode: number
  contentType: string
  html: string
  loadTime: number
  depth: number
  internalLinks: string[]
  externalLinks: string[]
  fetchedAt: Date
}
