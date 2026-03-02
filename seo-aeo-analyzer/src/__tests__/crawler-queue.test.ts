import { describe, it, expect, beforeEach } from 'vitest'
import { CrawlQueue, normalizeUrl, shouldSkipUrl } from '@/lib/crawler/queue'

describe('normalizeUrl', () => {
  it('removes trailing slash from paths', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page')
  })

  it('preserves root trailing slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('removes URL fragments', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page')
  })

  it('strips utm_source tracking param', () => {
    const url = normalizeUrl('https://example.com/page?utm_source=google')
    expect(url).not.toContain('utm_source')
  })

  it('strips multiple tracking params', () => {
    const url = normalizeUrl('https://example.com/?utm_source=g&utm_medium=cpc&utm_campaign=x')
    expect(url).not.toContain('utm_')
  })

  it('preserves non-tracking query params', () => {
    const url = normalizeUrl('https://example.com/search?q=seo')
    expect(url).toContain('q=seo')
  })

  it('returns original string on invalid URL', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url')
  })
})

describe('shouldSkipUrl', () => {
  it.each(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.css', '.js', '.woff', '.mp4', '.zip'])(
    'skips %s files',
    (ext) => {
      expect(shouldSkipUrl(`https://example.com/file${ext}`)).toBe(true)
    }
  )

  it('does not skip regular HTML pages', () => {
    expect(shouldSkipUrl('https://example.com/about')).toBe(false)
    expect(shouldSkipUrl('https://example.com/blog/post-1')).toBe(false)
  })
})

describe('CrawlQueue', () => {
  let queue: CrawlQueue

  beforeEach(() => {
    queue = new CrawlQueue(10)
  })

  it('enqueues a new URL and reports it as seen', () => {
    const added = queue.enqueue({ url: 'https://example.com', depth: 0, priority: 0, parentUrl: null })
    expect(added).toBe(true)
    expect(queue.has('https://example.com')).toBe(true)
    expect(queue.totalSeen).toBe(1)
  })

  it('deduplicates the same URL', () => {
    queue.enqueue({ url: 'https://example.com/', depth: 0, priority: 0, parentUrl: null })
    const second = queue.enqueue({ url: 'https://example.com', depth: 0, priority: 0, parentUrl: null })
    expect(second).toBe(false)
    expect(queue.totalSeen).toBe(1)
  })

  it('deduplicates normalized variants', () => {
    queue.enqueue({ url: 'https://example.com/page/', depth: 0, priority: 0, parentUrl: null })
    const second = queue.enqueue({ url: 'https://example.com/page', depth: 0, priority: 0, parentUrl: null })
    expect(second).toBe(false)
  })

  it('skips binary file URLs', () => {
    const added = queue.enqueue({ url: 'https://example.com/file.pdf', depth: 0, priority: 0, parentUrl: null })
    expect(added).toBe(false)
  })

  it('respects maxPages cap', () => {
    const small = new CrawlQueue(2)
    small.enqueue({ url: 'https://example.com/1', depth: 0, priority: 0, parentUrl: null })
    small.enqueue({ url: 'https://example.com/2', depth: 0, priority: 0, parentUrl: null })
    const third = small.enqueue({ url: 'https://example.com/3', depth: 0, priority: 0, parentUrl: null })
    expect(third).toBe(false)
    expect(small.isFull()).toBe(true)
  })

  it('dequeues in priority order', () => {
    queue.enqueue({ url: 'https://example.com/low', depth: 2, priority: 2, parentUrl: null })
    queue.enqueue({ url: 'https://example.com/high', depth: 0, priority: 0, parentUrl: null })
    queue.enqueue({ url: 'https://example.com/mid', depth: 1, priority: 1, parentUrl: null })
    expect(queue.dequeue()?.url).toBe('https://example.com/high')
    expect(queue.dequeue()?.url).toBe('https://example.com/mid')
    expect(queue.dequeue()?.url).toBe('https://example.com/low')
  })

  it('returns null when no pending jobs', () => {
    expect(queue.dequeue()).toBeNull()
  })

  it('marks jobs complete', () => {
    queue.enqueue({ url: 'https://example.com', depth: 0, priority: 0, parentUrl: null })
    queue.dequeue()
    queue.markComplete('https://example.com')
    expect(queue.completedCount).toBe(1)
    expect(queue.failedCount).toBe(0)
  })

  it('marks jobs failed with error message', () => {
    queue.enqueue({ url: 'https://example.com', depth: 0, priority: 0, parentUrl: null })
    queue.dequeue()
    queue.markFailed('https://example.com', 'Timeout')
    expect(queue.failedCount).toBe(1)
    expect(queue.completedCount).toBe(0)
  })

  it('isEmpty when all jobs are done', () => {
    queue.enqueue({ url: 'https://example.com', depth: 0, priority: 0, parentUrl: null })
    queue.dequeue()
    queue.markComplete('https://example.com')
    expect(queue.isEmpty()).toBe(true)
  })

  it('is not empty while jobs are crawling', () => {
    queue.enqueue({ url: 'https://example.com', depth: 0, priority: 0, parentUrl: null })
    queue.dequeue() // status → crawling
    expect(queue.isEmpty()).toBe(false)
  })
})
