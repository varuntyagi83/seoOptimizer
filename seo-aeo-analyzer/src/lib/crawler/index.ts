import EventEmitter from 'eventemitter3'
import pLimit from 'p-limit'
import type { CrawlConfig, CrawledPage, CrawlProgress } from '@/types/crawler'
import { CrawlQueue } from './queue'
import { PageFetcher } from './fetcher'
import { extractLinks } from './link-extractor'

interface CrawlerEvents {
  'page-start': (url: string) => void
  'page-complete': (page: CrawledPage) => void
  'page-failed': (url: string, error: string) => void
  'crawl-complete': (pages: CrawledPage[]) => void
  'progress': (progress: CrawlProgress) => void
}

export class SiteCrawler extends EventEmitter<CrawlerEvents> {
  private config: CrawlConfig
  private queue: CrawlQueue
  private fetcher: PageFetcher
  private pages: CrawledPage[] = []
  private cancelled = false
  private startTime = 0

  constructor(config: CrawlConfig) {
    super()
    this.config = config
    this.queue = new CrawlQueue(config.maxPages)
    this.fetcher = new PageFetcher(config.timeout)
  }

  cancel(): void {
    this.cancelled = true
  }

  getPages(): CrawledPage[] {
    return this.pages
  }

  private getProgress(): CrawlProgress {
    const elapsed = (Date.now() - this.startTime) / 1000
    const completed = this.queue.completedCount
    const pagesPerSecond = elapsed > 0 ? completed / elapsed : 0
    const remaining = this.queue.pendingCount
    const estimatedTimeRemaining = pagesPerSecond > 0 ? remaining / pagesPerSecond : 0

    return {
      total: this.queue.totalSeen,
      completed,
      failed: this.queue.failedCount,
      currentUrl: null,
      pagesPerSecond: Math.round(pagesPerSecond * 10) / 10,
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
    }
  }

  private async fetchSitemap(baseUrl: string): Promise<string[]> {
    const urls: string[] = []
    try {
      const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString()
      const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return urls
      const text = await res.text()
      const matches = text.matchAll(/<loc>(.*?)<\/loc>/gi)
      for (const match of matches) {
        const url = match[1].trim()
        if (url.startsWith(baseUrl) || new URL(url).hostname === new URL(baseUrl).hostname) {
          urls.push(url)
        }
      }
    } catch {
      // Sitemap not available — continue without it
    }
    return urls
  }

  async *start(): AsyncGenerator<CrawlProgress> {
    this.startTime = Date.now()

    // Enqueue the start URL with highest priority
    this.queue.enqueue({
      url: this.config.startUrl,
      depth: 0,
      priority: 0,
      parentUrl: null,
    })

    // Optionally fetch sitemap and enqueue those URLs
    if (this.config.includeSitemap) {
      const sitemapUrls = await this.fetchSitemap(this.config.startUrl)
      for (const url of sitemapUrls) {
        this.queue.enqueue({ url, depth: 1, priority: 1, parentUrl: this.config.startUrl })
      }
    }

    const limit = pLimit(this.config.concurrency)
    const inFlight = new Set<Promise<void>>()

    while (!this.cancelled) {
      // Fill up to concurrency limit
      while (inFlight.size < this.config.concurrency && !this.queue.isFull()) {
        const job = this.queue.dequeue()
        if (!job) break

        const task = limit(async () => {
          this.emit('page-start', job.url)
          this.emit('progress', { ...this.getProgress(), currentUrl: job.url })

          try {
            const page = await this.fetcher.fetch(job.url, job.depth)

            // Extract and enqueue links
            if (page.html && job.depth < this.config.maxDepth) {
              const { internal, external } = extractLinks(page.html, job.url)
              page.internalLinks = internal.map(l => l.url)
              page.externalLinks = external

              for (const link of internal) {
                if (!this.queue.isFull()) {
                  this.queue.enqueue({
                    url: link.url,
                    depth: job.depth + 1,
                    priority: job.depth + 1,
                    parentUrl: job.url,
                  })
                }
              }
            }

            this.pages.push(page)
            this.queue.markComplete(job.url)
            this.emit('page-complete', page)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.queue.markFailed(job.url, message)
            this.emit('page-failed', job.url, message)
          }

          this.emit('progress', this.getProgress())
        })

        const tracked = task.finally(() => inFlight.delete(tracked))
        inFlight.add(tracked)
      }

      if (inFlight.size === 0 && this.queue.pendingCount === 0) break

      // Yield progress and wait for at least one task to finish
      yield this.getProgress()
      if (inFlight.size > 0) await Promise.race(inFlight)
    }

    // Wait for remaining tasks
    await Promise.allSettled(inFlight)

    this.emit('crawl-complete', this.pages)
    yield this.getProgress()
  }
}
