import pRetry, { AbortError } from 'p-retry'
import type { CrawledPage } from '@/types/crawler'

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

const RETRYABLE_STATUS = new Set([403, 408, 429, 500, 502, 503, 504])

// Cap HTML at 512KB — enough for all SEO-relevant content (title, meta, headings, body text)
const MAX_HTML_CHARS = 512 * 1024

// Stream-read a Response body up to MAX_HTML_CHARS characters
async function streamReadHtml(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return ''
  let html = ''
  const reader = body.getReader()
  const decoder = new TextDecoder()
  try {
    while (html.length < MAX_HTML_CHARS) {
      const { done, value } = await reader.read()
      if (done || !value) break
      html += decoder.decode(value, { stream: true })
    }
    html += decoder.decode()
  } finally {
    reader.cancel().catch(() => {})
  }
  return html
}

// Strip heavy inline tags that are irrelevant for SEO but dominate page size.
// Preserves application/ld+json scripts (needed for structured data analysis).
function stripHeavyTags(html: string): string {
  return html
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

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

  private async fetchFromArchive(url: string, depth: number): Promise<CrawledPage> {
    const availUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
    const availRes = await fetch(availUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': randomUA() },
    })
    const avail = await availRes.json() as {
      archived_snapshots?: { closest?: { available: boolean; url: string } }
    }

    const snapshot = avail.archived_snapshots?.closest
    if (!snapshot?.available || !snapshot.url) {
      throw new Error(`Access denied (403) — website blocks crawlers and no archived snapshot found`)
    }

    // Wayback URLs come as http:// — upgrade to https
    const archiveUrl = snapshot.url.replace(/^http:\/\//, 'https://')
    const response = await fetch(archiveUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': randomUA(), 'Accept-Encoding': 'identity' },
      redirect: 'follow',
    })

    let html = await streamReadHtml(response.body)
    html = stripHeavyTags(html)

    return {
      url,
      finalUrl: url,
      statusCode: 200,
      contentType: 'text/html',
      html,
      loadTime: 0,
      depth,
      internalLinks: [],
      externalLinks: [],
      fetchedAt: new Date(),
    } satisfies CrawledPage
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
                'User-Agent': randomUA(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'identity',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
              },
              redirect: 'follow',
            })

            clearTimeout(timer)

            // Hard failures — don't retry
            if (response.status >= 400 && !RETRYABLE_STATUS.has(response.status)) {
              const STATUS_MESSAGES: Record<number, string> = {
                401: 'Authentication required (401) — this page requires a login',
                404: 'Page not found (404)',
                410: 'Page permanently removed (410)',
                451: 'Content unavailable for legal reasons (451)',
              }
              const msg = STATUS_MESSAGES[response.status] ?? `HTTP ${response.status} — page could not be fetched`
              throw new AbortError(msg)
            }

            // 403 — retryable with rotated UA (up to 3 attempts)
            if (response.status === 403) {
              throw new Error(`Access denied (403) — website is blocking access`)
            }

            if (!response.ok && RETRYABLE_STATUS.has(response.status)) {
              throw new Error(`Retryable status: ${response.status}`)
            }

            const contentType = response.headers.get('content-type') || ''
            let html = ''
            if (contentType.includes('text/html')) {
              html = await streamReadHtml(response.body)
              // Strip heavy tags — preserves application/ld+json for schema analysis
              html = stripHeavyTags(html)
            }
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
          // Don't waste retries on 403 — either it's consistently blocked (depth > 0
          // will just fail) or we'll try Wayback after the first attempt (depth 0)
          shouldRetry: (error) => !String(error).includes('403'),
          onFailedAttempt: (error) => {
            console.warn(`[Fetcher] Attempt ${error.attemptNumber} failed for ${url}: ${String(error)}`)
          },
        }
      )

      this.circuitBreaker.recordSuccess()
      return page
    } catch (err) {
      // If direct fetch failed with 403, try Wayback Machine — but only for the
      // start URL (depth 0). Deeper pages on 403-blocked sites are all blocked;
      // trying Wayback for every subpage causes archive.org rate-limiting and hangs.
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('403') && depth === 0) {
        try {
          console.info(`[Fetcher] Falling back to Wayback Machine for ${url}`)
          const archived = await this.fetchFromArchive(url, depth)
          this.circuitBreaker.recordSuccess()
          return archived
        } catch (archiveErr) {
          this.circuitBreaker.recordFailure()
          throw archiveErr
        }
      }
      this.circuitBreaker.recordFailure()
      throw err
    }
  }

  getCircuitState() {
    return this.circuitBreaker.getState()
  }
}
