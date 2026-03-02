import type { CrawlConfig, CrawlProgress, CrawledPage } from './crawler'
import type { PageAnalysis, SiteAnalysis } from './analysis'

export type OrchestratorState =
  | 'idle'
  | 'initializing'
  | 'crawling'
  | 'analyzing'
  | 'aggregating'
  | 'ai-processing'
  | 'complete'
  | 'error'
  | 'cancelled'

export interface OrchestratorError {
  phase: OrchestratorState
  url?: string
  message: string
  retryable: boolean
  timestamp: Date
}

export interface OrchestratorContext {
  config: CrawlConfig
  state: OrchestratorState
  progress: CrawlProgress
  crawledPages: CrawledPage[]
  pageAnalyses: PageAnalysis[]
  siteAnalysis: SiteAnalysis | null
  errors: OrchestratorError[]
  startedAt: Date | null
  completedAt: Date | null
}
