import { describe, it, expect } from 'vitest'
import { analyzeTechnical } from '@/lib/analyzer/technical'
import type { CrawledPage } from '@/types/crawler'

function makePage(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    statusCode: 200,
    contentType: 'text/html',
    html: '<html><body></body></html>',
    loadTime: 1000,
    depth: 0,
    internalLinks: [],
    externalLinks: [],
    fetchedAt: new Date(),
    ...overrides,
  }
}

describe('analyzeTechnical', () => {
  describe('HTTPS check', () => {
    it('passes for https URLs', () => {
      const result = analyzeTechnical(makePage({ url: 'https://example.com' }))
      expect(result.find(c => c.tag === 'https')?.status).toBe('pass')
    })

    it('fails for http URLs', () => {
      const result = analyzeTechnical(makePage({ url: 'http://example.com' }))
      expect(result.find(c => c.tag === 'https')?.status).toBe('fail')
    })
  })

  describe('load time', () => {
    it('passes when load time ≤ 2000ms', () => {
      const result = analyzeTechnical(makePage({ loadTime: 1500 }))
      expect(result.find(c => c.tag === 'load-time')?.status).toBe('pass')
    })

    it('warns when load time is 2001-4000ms', () => {
      const result = analyzeTechnical(makePage({ loadTime: 3000 }))
      expect(result.find(c => c.tag === 'load-time')?.status).toBe('warning')
    })

    it('fails when load time > 4000ms', () => {
      const result = analyzeTechnical(makePage({ loadTime: 5000 }))
      expect(result.find(c => c.tag === 'load-time')?.status).toBe('fail')
    })

    it('shows formatted seconds in found field', () => {
      const result = analyzeTechnical(makePage({ loadTime: 2500 }))
      expect(result.find(c => c.tag === 'load-time')?.found).toContain('2.50s')
    })
  })

  describe('status code', () => {
    it('passes for 200', () => {
      const result = analyzeTechnical(makePage({ statusCode: 200 }))
      expect(result.find(c => c.tag === 'status-code')?.status).toBe('pass')
    })

    it('warns for 3xx redirects', () => {
      const result = analyzeTechnical(makePage({ statusCode: 301 }))
      expect(result.find(c => c.tag === 'status-code')?.status).toBe('warning')
    })

    it('fails for 4xx errors', () => {
      const result = analyzeTechnical(makePage({ statusCode: 404 }))
      expect(result.find(c => c.tag === 'status-code')?.status).toBe('fail')
    })

    it('fails for 5xx errors', () => {
      const result = analyzeTechnical(makePage({ statusCode: 500 }))
      expect(result.find(c => c.tag === 'status-code')?.status).toBe('fail')
    })
  })

  describe('structured data', () => {
    it('passes when JSON-LD is present', () => {
      const page = makePage({
        html: `<html><head>
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
        </head><body></body></html>`,
      })
      const result = analyzeTechnical(page)
      expect(result.find(c => c.tag === 'structured-data')?.status).toBe('pass')
    })

    it('warns when no structured data', () => {
      const result = analyzeTechnical(makePage())
      expect(result.find(c => c.tag === 'structured-data')?.status).toBe('warning')
    })

    it('extracts schema type in found field', () => {
      const page = makePage({
        html: `<html><head>
          <script type="application/ld+json">{"@type":"Organization","name":"Test"}</script>
        </head><body></body></html>`,
      })
      const result = analyzeTechnical(page)
      expect(result.find(c => c.tag === 'structured-data')?.found).toContain('Organization')
    })

    it('passes with microdata itemscope', () => {
      const page = makePage({ html: '<html><body><div itemscope itemtype="https://schema.org/Product"></div></body></html>' })
      const result = analyzeTechnical(page)
      expect(result.find(c => c.tag === 'structured-data')?.status).toBe('pass')
    })
  })

  it('returns 4 check items', () => {
    const result = analyzeTechnical(makePage())
    expect(result).toHaveLength(4)
  })
})
