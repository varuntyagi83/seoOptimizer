import EventEmitter from 'eventemitter3'
import type { CrawlConfig, CrawledPage, CrawlProgress } from '@/types/crawler'
import type { PageAnalysis, SiteAnalysis } from '@/types/analysis'
import type { OrchestratorState, OrchestratorContext, OrchestratorError } from '@/types/orchestrator'
import { SiteCrawler } from '@/lib/crawler'
import { analyzePages } from '@/lib/analyzer'
import { aggregateSiteAnalysis } from '@/lib/analyzer/aggregator'
import { generateRecommendations } from '@/lib/openai'

interface OrchestratorEvents {
  'state-change': (event: { from: OrchestratorState; to: OrchestratorState; timestamp: Date }) => void
  'crawl-progress': (progress: CrawlProgress) => void
  'page-analyzed': (event: { url: string; scores: { overall: number; seo: number; aeo: number } }) => void
  'error': (error: OrchestratorError) => void
  'complete': (analysis: SiteAnalysis) => void
}

export class AnalysisOrchestrator extends EventEmitter<OrchestratorEvents> {
  private context: OrchestratorContext
  private crawler: SiteCrawler | null = null
  private _cancelled = false

  constructor(config: CrawlConfig) {
    super()
    this.context = {
      config,
      state: 'idle',
      progress: { total: 0, completed: 0, failed: 0, currentUrl: null, pagesPerSecond: 0, estimatedTimeRemaining: 0 },
      crawledPages: [],
      pageAnalyses: [],
      siteAnalysis: null,
      errors: [],
      startedAt: null,
      completedAt: null,
    }
  }

  getContext(): OrchestratorContext {
    return { ...this.context }
  }

  getState(): OrchestratorState {
    return this.context.state
  }

  cancel(): void {
    this._cancelled = true
    this.crawler?.cancel()
    this.transition('cancelled')
  }

  private transition(to: OrchestratorState): void {
    const from = this.context.state
    this.context.state = to
    this.emit('state-change', { from, to, timestamp: new Date() })
  }

  private recordError(phase: OrchestratorState, message: string, url?: string, retryable = false): void {
    const err: OrchestratorError = { phase, url, message, retryable, timestamp: new Date() }
    this.context.errors.push(err)
    this.emit('error', err)
  }

  async start(): Promise<SiteAnalysis> {
    this.context.startedAt = new Date()
    this.transition('initializing')

    // ── Phase 1: Crawl ──────────────────────────────────────────────────────
    let crawledPages: CrawledPage[] = []
    try {
      this.transition('crawling')
      this.crawler = new SiteCrawler(this.context.config)

      this.crawler.on('page-failed', (url, error) => {
        this.recordError('crawling', error, url, true)
      })

      for await (const progress of this.crawler.start()) {
        this.context.progress = progress
        this.emit('crawl-progress', progress)

        if (this._cancelled) {
          break
        }
      }

      crawledPages = this.crawler.getPages()
      this.context.crawledPages = crawledPages

      if (crawledPages.length === 0) {
        this.recordError('crawling', 'No pages were successfully crawled')
      }
    } catch (err) {
      this.recordError('crawling', err instanceof Error ? err.message : String(err), undefined, false)
      // Continue with whatever pages we managed to get
      crawledPages = this.crawler?.getPages() ?? []
      this.context.crawledPages = crawledPages
    }

    if (this._cancelled) {
      return this.buildPartialResult(crawledPages, [])
    }

    // ── Phase 2: Analyze ────────────────────────────────────────────────────
    let pageAnalyses: PageAnalysis[] = []
    try {
      this.transition('analyzing')

      pageAnalyses = await analyzePages(
        crawledPages,
        4,
        (completed, total, url) => {
          this.emit('page-analyzed', {
            url,
            scores: this.context.pageAnalyses[completed - 1]?.scores ?? { overall: 0, seo: 0, aeo: 0 },
          })
          this.context.progress = { ...this.context.progress, completed, total }
        }
      )

      // Emit scores as they're computed
      for (const analysis of pageAnalyses) {
        this.emit('page-analyzed', { url: analysis.url, scores: analysis.scores })
      }

      this.context.pageAnalyses = pageAnalyses
    } catch (err) {
      this.recordError('analyzing', err instanceof Error ? err.message : String(err))
      // Continue with whatever analyses we have
      pageAnalyses = this.context.pageAnalyses
    }

    if (this._cancelled) {
      return this.buildPartialResult(crawledPages, pageAnalyses)
    }

    // ── Phase 3: Aggregate ──────────────────────────────────────────────────
    let siteAnalysis: SiteAnalysis
    try {
      this.transition('aggregating')
      siteAnalysis = aggregateSiteAnalysis(pageAnalyses, crawledPages, this.context.config)
      this.context.siteAnalysis = siteAnalysis
    } catch (err) {
      this.recordError('aggregating', err instanceof Error ? err.message : String(err))
      siteAnalysis = this.buildPartialResult(crawledPages, pageAnalyses)
    }

    // ── Phase 4: AI recommendations ─────────────────────────────────────────
    this.transition('ai-processing')
    try {
      const aiRecommendations = await generateRecommendations(siteAnalysis)
      siteAnalysis = { ...siteAnalysis, aiRecommendations }
      this.context.siteAnalysis = siteAnalysis
    } catch (err) {
      this.recordError('ai-processing', err instanceof Error ? err.message : String(err))
      // Graceful degradation: return results without AI recommendations
    }

    // ── Complete ─────────────────────────────────────────────────────────────
    this.context.completedAt = new Date()
    this.transition('complete')
    this.emit('complete', siteAnalysis)
    return siteAnalysis
  }

  private buildPartialResult(crawledPages: CrawledPage[], pageAnalyses: PageAnalysis[]): SiteAnalysis {
    try {
      return aggregateSiteAnalysis(
        pageAnalyses.length > 0 ? pageAnalyses : [],
        crawledPages,
        this.context.config
      )
    } catch {
      // Absolute fallback
      const domain = (() => { try { return new URL(this.context.config.startUrl).hostname } catch { return 'unknown' } })()
      return {
        id: crypto.randomUUID(),
        domain,
        startUrl: this.context.config.startUrl,
        crawlConfig: this.context.config,
        crawledAt: this.context.startedAt ?? new Date(),
        completedAt: new Date(),
        scores: { overall: 0, seo: 0, aeo: 0 },
        pages: pageAnalyses,
        siteWideIssues: { critical: [], warnings: [], opportunities: [] },
        stats: {
          totalPages: crawledPages.length,
          avgLoadTime: 0,
          pagesWithoutH1: 0,
          pagesWithoutDescription: 0,
          imagesWithoutAlt: 0,
          pagesWithStructuredData: 0,
          pagesWithFaqSchema: 0,
        },
      }
    }
  }
}
