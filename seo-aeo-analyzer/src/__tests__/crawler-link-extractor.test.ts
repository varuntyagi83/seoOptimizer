import { describe, it, expect } from 'vitest'
import { extractLinks } from '@/lib/crawler/link-extractor'

const baseUrl = 'https://example.com'

function makeHtml(links: string): string {
  return `<html><body>${links}</body></html>`
}

describe('extractLinks', () => {
  it('extracts internal links', () => {
    const html = makeHtml('<a href="/about">About</a><a href="/contact">Contact</a>')
    const { internal } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(2)
    expect(internal[0].url).toContain('/about')
    expect(internal[1].url).toContain('/contact')
  })

  it('extracts external links', () => {
    const html = makeHtml('<a href="https://google.com">Google</a>')
    const { external } = extractLinks(html, baseUrl)
    expect(external).toHaveLength(1)
    expect(external[0]).toContain('google.com')
  })

  it('ignores fragment-only links', () => {
    const html = makeHtml('<a href="#section">Jump</a>')
    const { internal, external } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(0)
    expect(external).toHaveLength(0)
  })

  it('ignores mailto links', () => {
    const html = makeHtml('<a href="mailto:test@example.com">Email</a>')
    const { internal, external } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(0)
    expect(external).toHaveLength(0)
  })

  it('ignores tel links', () => {
    const html = makeHtml('<a href="tel:+1234567890">Call</a>')
    const { internal } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(0)
  })

  it('filters out binary file links', () => {
    const html = makeHtml('<a href="/doc.pdf">PDF</a><a href="/img.jpg">Image</a>')
    const { internal } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(0)
  })

  it('resolves relative URLs against base', () => {
    const html = makeHtml('<a href="page">Relative</a>')
    const { internal } = extractLinks(html, 'https://example.com/section/')
    expect(internal[0].url).toContain('example.com')
  })

  it('deduplicates the same URL', () => {
    const html = makeHtml('<a href="/page">Link 1</a><a href="/page/">Link 2</a>')
    const { internal } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(1)
  })

  it('captures link text', () => {
    const html = makeHtml('<a href="/about">About Us</a>')
    const { internal } = extractLinks(html, baseUrl)
    expect(internal[0].text).toBe('About Us')
  })

  it('classifies nav links as nav context', () => {
    const html = `<html><body><nav><a href="/home">Home</a></nav></body></html>`
    const { internal } = extractLinks(html, baseUrl)
    expect(internal[0].context).toBe('nav')
  })

  it('classifies footer links as footer context', () => {
    const html = `<html><body><footer><a href="/privacy">Privacy</a></footer></body></html>`
    const { internal } = extractLinks(html, baseUrl)
    expect(internal[0].context).toBe('footer')
  })

  it('classifies main content links as content context', () => {
    const html = `<html><body><main><p><a href="/blog">Blog</a></p></main></body></html>`
    const { internal } = extractLinks(html, baseUrl)
    expect(internal[0].context).toBe('content')
  })

  it('handles absolute internal URLs', () => {
    const html = makeHtml('<a href="https://example.com/about">About</a>')
    const { internal } = extractLinks(html, baseUrl)
    expect(internal).toHaveLength(1)
    expect(internal[0].url).toContain('/about')
  })

  it('handles empty HTML gracefully', () => {
    const { internal, external } = extractLinks('', baseUrl)
    expect(internal).toHaveLength(0)
    expect(external).toHaveLength(0)
  })
})
