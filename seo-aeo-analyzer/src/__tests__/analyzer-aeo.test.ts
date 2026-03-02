import { describe, it, expect } from 'vitest'
import { analyzeAeo } from '@/lib/analyzer/aeo'

function html(body: string, head = ''): string {
  return `<html><head>${head}</head><body>${body}</body></html>`
}

function faqSchema(): string {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: 'What is SEO?' }],
  })}</script>`
}

function howToSchema(): string {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to optimize',
  })}</script>`
}

describe('analyzeAeo', () => {
  describe('FAQ schema', () => {
    it('passes when FAQPage schema is present', () => {
      const result = analyzeAeo(html('', faqSchema()))
      expect(result.find(c => c.tag === 'faq-schema')?.status).toBe('pass')
    })

    it('warns when FAQPage schema is missing', () => {
      const result = analyzeAeo(html('<p>Content</p>'))
      expect(result.find(c => c.tag === 'faq-schema')?.status).toBe('warning')
    })

    it('detects FAQPage inside @graph', () => {
      const schema = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [{ '@type': 'FAQPage' }],
      })
      const result = analyzeAeo(html('', `<script type="application/ld+json">${schema}</script>`))
      expect(result.find(c => c.tag === 'faq-schema')?.status).toBe('pass')
    })
  })

  describe('HowTo schema', () => {
    it('passes when HowTo schema is present', () => {
      const result = analyzeAeo(html('', howToSchema()))
      expect(result.find(c => c.tag === 'howto-schema')?.status).toBe('pass')
    })

    it('warns when HowTo schema is missing', () => {
      const result = analyzeAeo(html('<p>Content</p>'))
      expect(result.find(c => c.tag === 'howto-schema')?.status).toBe('warning')
    })
  })

  describe('Speakable schema', () => {
    it('passes when speakable is present in JSON-LD', () => {
      const schema = JSON.stringify({ '@type': 'Article', speakable: { '@type': 'SpeakableSpecification' } })
      const result = analyzeAeo(html('', `<script type="application/ld+json">${schema}</script>`))
      expect(result.find(c => c.tag === 'speakable-schema')?.status).toBe('pass')
    })

    it('warns when speakable is not present', () => {
      const result = analyzeAeo(html('<p>No speakable</p>'))
      expect(result.find(c => c.tag === 'speakable-schema')?.status).toBe('warning')
    })
  })

  describe('question-based headings', () => {
    it('passes with 2+ question headings', () => {
      const result = analyzeAeo(html('<h2>How does SEO work?</h2><h2>What is AEO?</h2>'))
      expect(result.find(c => c.tag === 'question-headings')?.status).toBe('pass')
    })

    it('warns with 0-1 question headings', () => {
      const result = analyzeAeo(html('<h2>About Us</h2>'))
      expect(result.find(c => c.tag === 'question-headings')?.status).toBe('warning')
    })

    it.each(['What', 'How', 'Why', 'When', 'Where', 'Who', 'Which', 'Can', 'Does', 'Is', 'Are', 'Should'])(
      'recognizes "%s" as question word',
      (word) => {
        const result = analyzeAeo(html(`<h2>${word} is this?</h2><h2>${word} does it work?</h2>`))
        expect(result.find(c => c.tag === 'question-headings')?.status).toBe('pass')
      }
    )

    it('captures first question heading in found field', () => {
      const result = analyzeAeo(html('<h2>How does SEO work?</h2><h2>What is AEO?</h2>'))
      expect(result.find(c => c.tag === 'question-headings')?.found).toContain('How does SEO work?')
    })
  })

  describe('lists and tables', () => {
    it('passes with 2+ lists or tables', () => {
      const result = analyzeAeo(html('<ul><li>Item 1</li></ul><ol><li>Item 2</li></ol>'))
      expect(result.find(c => c.tag === 'lists-and-tables')?.status).toBe('pass')
    })

    it('warns with only one list', () => {
      const result = analyzeAeo(html('<ul><li>Item</li></ul>'))
      expect(result.find(c => c.tag === 'lists-and-tables')?.status).toBe('warning')
    })

    it('counts tables as well as lists', () => {
      const result = analyzeAeo(html('<table><tr><td>A</td></tr></table><table><tr><td>B</td></tr></table>'))
      expect(result.find(c => c.tag === 'lists-and-tables')?.status).toBe('pass')
    })
  })

  describe('concise answers', () => {
    it('passes with 2+ concise paragraphs after headings', () => {
      const shortPara = 'This is a concise answer with about twenty words total here now.'
      const result = analyzeAeo(html(
        `<h2>Question one?</h2><p>${shortPara}</p>` +
        `<h2>Question two?</h2><p>${shortPara}</p>`
      ))
      expect(result.find(c => c.tag === 'concise-answers')?.status).toBe('pass')
    })

    it('warns with no concise paragraphs', () => {
      const result = analyzeAeo(html('<h2>No paragraph after this</h2>'))
      expect(result.find(c => c.tag === 'concise-answers')?.status).toBe('warning')
    })
  })

  it('returns 6 check items', () => {
    const result = analyzeAeo(html('<p>Content</p>'))
    expect(result).toHaveLength(6)
  })
})
