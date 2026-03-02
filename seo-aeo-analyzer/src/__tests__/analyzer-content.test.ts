import { describe, it, expect } from 'vitest'
import { analyzeContent } from '@/lib/analyzer/content'

function html(body: string): string {
  return `<html><body>${body}</body></html>`
}

describe('analyzeContent', () => {
  describe('H1 count', () => {
    it('passes with exactly one H1', () => {
      const result = analyzeContent(html('<h1>Main Heading</h1>'))
      expect(result.find(c => c.tag === 'h1-count')?.status).toBe('pass')
    })

    it('fails when H1 is missing', () => {
      const result = analyzeContent(html('<h2>Sub heading</h2>'))
      expect(result.find(c => c.tag === 'h1-count')?.status).toBe('fail')
    })

    it('warns with multiple H1s', () => {
      const result = analyzeContent(html('<h1>First</h1><h1>Second</h1>'))
      expect(result.find(c => c.tag === 'h1-count')?.status).toBe('warning')
    })

    it('includes H1 text in found field', () => {
      const result = analyzeContent(html('<h1>My Page Title</h1>'))
      expect(result.find(c => c.tag === 'h1-count')?.found).toContain('My Page Title')
    })
  })

  describe('heading hierarchy', () => {
    it('passes with correct hierarchy H1→H2→H3', () => {
      const result = analyzeContent(html('<h1>H1</h1><h2>H2</h2><h3>H3</h3>'))
      expect(result.find(c => c.tag === 'heading-hierarchy')?.status).toBe('pass')
    })

    it('warns when headings skip levels', () => {
      const result = analyzeContent(html('<h1>H1</h1><h3>Skipped H2</h3>'))
      expect(result.find(c => c.tag === 'heading-hierarchy')?.status).toBe('warning')
    })

    it('passes with single heading', () => {
      const result = analyzeContent(html('<h1>Only H1</h1>'))
      expect(result.find(c => c.tag === 'heading-hierarchy')?.status).toBe('pass')
    })
  })

  describe('word count', () => {
    it('passes with 300+ words', () => {
      const words = Array(310).fill('word').join(' ')
      const result = analyzeContent(html(`<p>${words}</p>`))
      expect(result.find(c => c.tag === 'word-count')?.status).toBe('pass')
    })

    it('warns with 150-299 words', () => {
      const words = Array(200).fill('word').join(' ')
      const result = analyzeContent(html(`<p>${words}</p>`))
      expect(result.find(c => c.tag === 'word-count')?.status).toBe('warning')
    })

    it('fails with fewer than 150 words', () => {
      const result = analyzeContent(html('<p>Too short content.</p>'))
      expect(result.find(c => c.tag === 'word-count')?.status).toBe('fail')
    })

    it('reports word count in found field', () => {
      const words = Array(310).fill('word').join(' ')
      const result = analyzeContent(html(`<p>${words}</p>`))
      expect(result.find(c => c.tag === 'word-count')?.found).toContain('words')
    })
  })

  describe('image alt text', () => {
    it('passes when all images have alt text', () => {
      const result = analyzeContent(html('<img src="a.jpg" alt="desc"><img src="b.jpg" alt="desc2">'))
      expect(result.find(c => c.tag === 'image-alt-text')?.status).toBe('pass')
    })

    it('fails when most images are missing alt text', () => {
      const result = analyzeContent(html('<img src="a.jpg"><img src="b.jpg"><img src="c.jpg">'))
      expect(result.find(c => c.tag === 'image-alt-text')?.status).toBe('fail')
    })

    it('warns when some images miss alt text', () => {
      const result = analyzeContent(html(
        '<img src="a.jpg" alt="ok">' +
        '<img src="b.jpg" alt="ok">' +
        '<img src="c.jpg" alt="ok">' +
        '<img src="d.jpg" alt="ok">' +
        '<img src="e.jpg">'  // 80% coverage = warning
      ))
      expect(result.find(c => c.tag === 'image-alt-text')?.status).toBe('warning')
    })

    it('passes when there are no images', () => {
      const result = analyzeContent(html('<p>No images here</p>'))
      expect(result.find(c => c.tag === 'image-alt-text')?.status).toBe('pass')
    })

    it('counts images with empty alt as missing', () => {
      const result = analyzeContent(html('<img src="a.jpg" alt="">'))
      expect(result.find(c => c.tag === 'image-alt-text')?.status).toBe('fail')
    })
  })

  describe('internal links', () => {
    it('passes with 3+ internal links', () => {
      const result = analyzeContent(html('<a href="/a">A</a><a href="/b">B</a><a href="/c">C</a>'))
      expect(result.find(c => c.tag === 'internal-links')?.status).toBe('pass')
    })

    it('warns with 1-2 internal links', () => {
      const result = analyzeContent(html('<a href="/a">A</a>'))
      expect(result.find(c => c.tag === 'internal-links')?.status).toBe('warning')
    })

    it('fails with no internal links', () => {
      const result = analyzeContent(html('<p>No links</p>'))
      expect(result.find(c => c.tag === 'internal-links')?.status).toBe('fail')
    })
  })

  it('returns 6 check items', () => {
    const result = analyzeContent(html('<h1>Title</h1>'))
    expect(result).toHaveLength(6)
  })
})
