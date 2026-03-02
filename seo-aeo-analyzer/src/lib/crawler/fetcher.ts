import pRetry, { AbortError } from 'p-retry'
import type { CrawledPage } from '@/types/crawler'

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private lastFailureTime = 0
  private readonly failureThreshold: number
  private readonly recoveryTimeout: number

  constructor(failureThreshold = 5, recoveryTimeoutMs = 30000) {
    this.failureThreshold = failureThreshold
    this.recoveryTimeout = recoveryTimeoutMs
  }

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
        return false
      }
      return true
    }
    return false
  }

  recordSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState(): CircuitState {
    return this.state
  }
}

export class PageFetcher {
  private circuitBreaker: CircuitBreaker
  private timeout: number

  constructor(timeout = 15000) {
    this.circuitBreaker = new CircuitBreaker()
    this.timeout = timeout
  }

  async fetch(url: string, depth: number): Promise<CrawledPage> {
    if (this.circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker OPEN — skipping ${url}`)
    }

    const startTime = Date.now()

    try {
      const page = await pRetry(
        async () => {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), this.timeout)

          try {
            const response = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
              },
              redirect: 'follow',
            })

            clearTimeout(timer)

            // Don't retry client errors (except 408/429)
            if (response.status >= 400 && !RETRYABLE_STATUS.has(response.status)) {
              throw new AbortError(`Non-retryable status: ${response.status}`)
            }

            if (!response.ok && RETRYABLE_STATUS.has(response.status)) {
              throw new Error(`Retryable status: ${response.status}`)
            }

            const contentType = response.headers.get('content-type') || ''
            const html = contentType.includes('text/html') ? await response.text() : ''
            const loadTime = Date.now() - startTime

            // Extract internal/external links placeholder — filled by link-extractor
            return {
              url,
              finalUrl: response.url,
              statusCode: response.status,
              contentType,
              html,
              loadTime,
              depth,
              internalLinks: [],
              externalLinks: [],
              fetchedAt: new Date(),
            } satisfies CrawledPage
          } finally {
            clearTimeout(timer)
          }
        },
        {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 8000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(`[Fetcher] Attempt ${error.attemptNumber} failed for ${url}: ${String(error)}`)
          },
        }
      )

      this.circuitBreaker.recordSuccess()
      return page
    } catch (err) {
      this.circuitBreaker.recordFailure()
      throw err
    }
  }

  getCircuitState() {
    return this.circuitBreaker.getState()
  }
}
