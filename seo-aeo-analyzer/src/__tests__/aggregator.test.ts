import { describe, it, expect } from 'vitest'
import { aggregateSiteAnalysis } from '@/lib/analyzer/aggregator'
import type { CrawledPage } from '@/types/crawler'
import type { CrawlConfig } from '@/types/crawler'
import type { PageAnalysis, CheckItem } from '@/types/analysis'

const config: CrawlConfig = {
  startUrl: 'https://example.com',
  maxPages: 25,
  maxDepth: 2,
  respectRobotsTxt: false,
  includeSitemap: false,
  concurrency: 3,
  timeout: 15000,
}

function makeCheck(tag: string, status: 'pass' | 'warning' | 'fail'): CheckItem {
  return { tag, status, found: '', recommendation: null, weight: 1 }
}

function makePage(url: string, depth: number, overrides: Partial<PageAnalysis> = {}): PageAnalysis {
  return {
    url,
    depth,
    scores: { overall: 75, seo: 70, aeo: 60 },
    meta: [makeCheck('meta-description', 'pass'), makeCheck('title', 'pass')],
    content: [makeCheck('h1-count', 'pass'), makeCheck('word-count', 'pass')],
    technical: [makeCheck('https', 'pass'), makeCheck('load-time', 'pass'), makeCheck('structured-data', 'pass')],
    aeo: [makeCheck('faq-schema', 'pass'), makeCheck('question-headings', 'pass')],
    ...overrides,
  }
}

function makeCrawledPage(url: string, loadTime = 1000): CrawledPage {
  return {
    url,
    finalUrl: url,
    statusCode: 200,
    contentType: 'text/html',
    html: '',
    loadTime,
    depth: 0,
    internalLinks: [],
    externalLinks: [],
    fetchedAt: new Date(),
  }
}

describe('aggregateSiteAnalysis', () => {
  it('returns a SiteAnalysis with a valid UUID id', () => {
    const result = aggregateSiteAnalysis([makePage('https://example.com', 0)], [], config)
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('extracts domain from startUrl', () => {
    const result = aggregateSiteAnalysis([], [], config)
    expect(result.domain).toBe('example.com')
  })

  it('reports correct totalPages count', () => {
    const pages = [makePage('https://example.com', 0), makePage('https://example.com/about', 1)]
    const result = aggregateSiteAnalysis(pages, [], config)
    expect(result.stats.totalPages).toBe(2)
  })

  it('calculates avgLoadTime from crawled pages', () => {
    const crawled = [makeCrawledPage('https://example.com', 1000), makeCrawledPage('https://example.com/a', 3000)]
    const result = aggregateSiteAnalysis([], crawled, config)
    expect(result.stats.avgLoadTime).toBe(2000)
  })

  it('counts pagesWithoutH1 correctly', () => {
    const pages = [
      makePage('https://example.com', 0, { content: [makeCheck('h1-count', 'fail')] }),
      makePage('https://example.com/a', 1),
    ]
    const result = aggregateSiteAnalysis(pages, [], config)
    expect(result.stats.pagesWithoutH1).toBe(1)
  })

  it('counts pagesWithoutDescription correctly', () => {
    const pages = [
      makePage('https://example.com', 0, { meta: [makeCheck('meta-description', 'fail')] }),
      makePage('https://example.com/a', 1, { meta: [makeCheck('meta-description', 'fail')] }),
      makePage('https://example.com/b', 1),
    ]
    const result = aggregateSiteAnalysis(pages, [], config)
    expect(result.stats.pagesWithoutDescription).toBe(2)
  })

  it('counts pagesWithStructuredData correctly', () => {
    const pages = [
      makePage('https://example.com', 0),                         // has structured-data pass
      makePage('https://example.com/a', 1, {
        technical: [makeCheck('structured-data', 'warning')],
      }),
    ]
    const result = aggregateSiteAnalysis(pages, [], config)
    expect(result.stats.pagesWithStructuredData).toBe(1)
  })

  it('weights depth-0 pages more heavily in scoring', () => {
    // depth-0 page: 100 score, depth-1 page: 0 score
    // weight(0) = 3, weight(1) = 2 → (100*3 + 0*2) / 5 = 60
    const pages = [
      makePage('https://example.com', 0, { scores: { overall: 100, seo: 100, aeo: 100 } }),
      makePage('https://example.com/a', 1, { scores: { overall: 0, seo: 0, aeo: 0 } }),
    ]
    const result = aggregateSiteAnalysis(pages, [], config)
    expect(result.scores.overall).toBe(60)
  })

  describe('site-wide issue detection', () => {
    it('adds critical issue when >50% of pages miss description', () => {
      const pages = Array.from({ length: 10 }, (_, i) =>
        makePage(`https://example.com/${i}`, 1, {
          meta: [makeCheck('meta-description', i < 6 ? 'fail' : 'pass')],
        })
      )
      const result = aggregateSiteAnalysis(pages, [], config)
      expect(result.siteWideIssues.critical.some(i => i.type === 'missing-description')).toBe(true)
    })

    it('adds warning when 20-50% of pages miss description', () => {
      const pages = Array.from({ length: 10 }, (_, i) =>
        makePage(`https://example.com/${i}`, 1, {
          meta: [makeCheck('meta-description', i < 3 ? 'fail' : 'pass')],
        })
      )
      const result = aggregateSiteAnalysis(pages, [], config)
      expect(result.siteWideIssues.warnings.some(i => i.type === 'missing-description')).toBe(true)
    })

    it('adds critical issue when >50% pages have no H1', () => {
      const pages = Array.from({ length: 10 }, (_, i) =>
        makePage(`https://example.com/${i}`, 1, {
          content: [makeCheck('h1-count', i < 6 ? 'fail' : 'pass')],
        })
      )
      const result = aggregateSiteAnalysis(pages, [], config)
      expect(result.siteWideIssues.critical.some(i => i.type === 'missing-h1')).toBe(true)
    })

    it('adds FAQ opportunity when pages have Q headings but no FAQ schema', () => {
      const pages = [
        makePage('https://example.com', 0, {
          aeo: [
            makeCheck('faq-schema', 'warning'),
            makeCheck('question-headings', 'pass'),
          ],
        }),
      ]
      const result = aggregateSiteAnalysis(pages, [], config)
      expect(result.siteWideIssues.opportunities.some(i => i.type === 'faq-schema-opportunity')).toBe(true)
    })

    it('adds slow pages warning when pages load >4s', () => {
      const pages = [
        makePage('https://example.com', 0, {
          technical: [makeCheck('load-time', 'fail'), makeCheck('structured-data', 'pass')],
        }),
      ]
      const result = aggregateSiteAnalysis(pages, [], config)
      expect(result.siteWideIssues.warnings.some(i => i.type === 'slow-pages')).toBe(true)
    })
  })

  it('handles empty pages array gracefully', () => {
    const result = aggregateSiteAnalysis([], [], config)
    expect(result.stats.totalPages).toBe(0)
    expect(result.scores.overall).toBe(0)
    expect(result.siteWideIssues.critical).toHaveLength(0)
  })
})
