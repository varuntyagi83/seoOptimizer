import { describe, it, expect } from 'vitest'
import { analyzeMeta } from '@/lib/analyzer/meta'

const url = 'https://example.com'

function html(head: string): string {
  return `<html><head>${head}</head><body></body></html>`
}

describe('analyzeMeta', () => {
  describe('title tag', () => {
    it('passes when title is 50-60 chars', () => {
      const title = 'A'.repeat(55)
      const result = analyzeMeta(html(`<title>${title}</title>`), url)
      expect(result.find(c => c.tag === 'title')?.status).toBe('pass')
    })

    it('warns when title is too short (<50 chars)', () => {
      const result = analyzeMeta(html('<title>Short</title>'), url)
      expect(result.find(c => c.tag === 'title')?.status).toBe('warning')
    })

    it('warns when title is too long (>60 chars)', () => {
      const title = 'A'.repeat(65)
      const result = analyzeMeta(html(`<title>${title}</title>`), url)
      expect(result.find(c => c.tag === 'title')?.status).toBe('warning')
    })

    it('fails when title is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'title')?.status).toBe('fail')
    })

    it('provides recommendation when title is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'title')?.recommendation).toBeTruthy()
    })

    it('has no recommendation when title is perfect', () => {
      const title = 'A'.repeat(55)
      const result = analyzeMeta(html(`<title>${title}</title>`), url)
      expect(result.find(c => c.tag === 'title')?.recommendation).toBeNull()
    })
  })

  describe('meta description', () => {
    it('passes when description is 120-160 chars', () => {
      const desc = 'A'.repeat(140)
      const result = analyzeMeta(html(`<meta name="description" content="${desc}">`), url)
      expect(result.find(c => c.tag === 'meta-description')?.status).toBe('pass')
    })

    it('warns when description is too short', () => {
      const result = analyzeMeta(html('<meta name="description" content="Short">'), url)
      expect(result.find(c => c.tag === 'meta-description')?.status).toBe('warning')
    })

    it('warns when description is too long', () => {
      const desc = 'A'.repeat(170)
      const result = analyzeMeta(html(`<meta name="description" content="${desc}">`), url)
      expect(result.find(c => c.tag === 'meta-description')?.status).toBe('warning')
    })

    it('fails when description is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'meta-description')?.status).toBe('fail')
    })
  })

  describe('canonical', () => {
    it('passes when canonical is present', () => {
      const result = analyzeMeta(html('<link rel="canonical" href="https://example.com">'), url)
      expect(result.find(c => c.tag === 'canonical')?.status).toBe('pass')
    })

    it('warns when canonical is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'canonical')?.status).toBe('warning')
    })
  })

  describe('viewport', () => {
    it('passes when viewport is present', () => {
      const result = analyzeMeta(html('<meta name="viewport" content="width=device-width, initial-scale=1">'), url)
      expect(result.find(c => c.tag === 'viewport')?.status).toBe('pass')
    })

    it('fails when viewport is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'viewport')?.status).toBe('fail')
    })
  })

  describe('robots meta', () => {
    it('passes when robots is not noindex', () => {
      const result = analyzeMeta(html('<meta name="robots" content="index, follow">'), url)
      expect(result.find(c => c.tag === 'robots-meta')?.status).toBe('pass')
    })

    it('warns when robots is noindex', () => {
      const result = analyzeMeta(html('<meta name="robots" content="noindex">'), url)
      expect(result.find(c => c.tag === 'robots-meta')?.status).toBe('warning')
    })
  })

  describe('Open Graph tags', () => {
    it('passes when og:title is present', () => {
      const result = analyzeMeta(html('<meta property="og:title" content="Test">'), url)
      expect(result.find(c => c.tag === 'og:title')?.status).toBe('pass')
    })

    it('warns when og:title is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'og:title')?.status).toBe('warning')
    })

    it('passes when og:image is present', () => {
      const result = analyzeMeta(html('<meta property="og:image" content="https://example.com/img.jpg">'), url)
      expect(result.find(c => c.tag === 'og:image')?.status).toBe('pass')
    })
  })

  describe('Twitter card', () => {
    it('passes when twitter:card is present', () => {
      const result = analyzeMeta(html('<meta name="twitter:card" content="summary_large_image">'), url)
      expect(result.find(c => c.tag === 'twitter:card')?.status).toBe('pass')
    })

    it('warns when twitter:card is missing', () => {
      const result = analyzeMeta(html(''), url)
      expect(result.find(c => c.tag === 'twitter:card')?.status).toBe('warning')
    })
  })

  it('returns 9 check items', () => {
    const result = analyzeMeta(html(''), url)
    expect(result).toHaveLength(9)
  })
})
