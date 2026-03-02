import * as cheerio from 'cheerio'
import type { CheckItem } from '@/types/analysis'

const QUESTION_WORDS = /^(what|how|why|when|where|who|which|can|does|is|are|should|will|do)\b/i

export function analyzeAeo(html: string): CheckItem[] {
  const $ = cheerio.load(html)
  const checks: CheckItem[] = []

  // FAQ Schema (FAQPage)
  let hasFaqSchema = false
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}')
      const types: string[] = []
      if (data['@type']) types.push(data['@type'])
      if (Array.isArray(data['@graph'])) {
        data['@graph'].forEach((g: Record<string, unknown>) => { if (g['@type']) types.push(String(g['@type'])) })
      }
      if (types.some(t => t === 'FAQPage')) hasFaqSchema = true
    } catch { /* skip */ }
  })
  checks.push({
    tag: 'faq-schema',
    status: hasFaqSchema ? 'pass' : 'warning',
    found: hasFaqSchema ? 'FAQPage schema present' : 'No FAQPage schema',
    recommendation: hasFaqSchema
      ? null
      : 'Add FAQPage JSON-LD schema to appear in Google\'s FAQ rich results and AI answer boxes',
    weight: 0.20,
  })

  // HowTo Schema
  let hasHowToSchema = false
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}')
      const types: string[] = []
      if (data['@type']) types.push(data['@type'])
      if (Array.isArray(data['@graph'])) {
        data['@graph'].forEach((g: Record<string, unknown>) => { if (g['@type']) types.push(String(g['@type'])) })
      }
      if (types.some(t => t === 'HowTo')) hasHowToSchema = true
    } catch { /* skip */ }
  })
  checks.push({
    tag: 'howto-schema',
    status: hasHowToSchema ? 'pass' : 'warning',
    found: hasHowToSchema ? 'HowTo schema present' : 'No HowTo schema',
    recommendation: hasHowToSchema
      ? null
      : 'If page contains step-by-step instructions, add HowTo schema for rich results',
    weight: 0.15,
  })

  // Speakable Schema
  let hasSpeakable = false
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}')
      if (JSON.stringify(data).includes('speakable')) hasSpeakable = true
    } catch { /* skip */ }
  })
  checks.push({
    tag: 'speakable-schema',
    status: hasSpeakable ? 'pass' : 'warning',
    found: hasSpeakable ? 'Speakable schema present' : 'No Speakable schema',
    recommendation: hasSpeakable
      ? null
      : 'Add Speakable schema to highlight content suitable for voice assistants',
    weight: 0.10,
  })

  // Question-based headings
  const allHeadings: string[] = []
  $('h1, h2, h3, h4').each((_, el) => allHeadings.push($(el).text().trim()))
  const questionHeadings = allHeadings.filter(h => QUESTION_WORDS.test(h))
  checks.push({
    tag: 'question-headings',
    status: questionHeadings.length >= 2 ? 'pass' : questionHeadings.length === 1 ? 'warning' : 'warning',
    found: questionHeadings.length > 0
      ? `${questionHeadings.length} question heading(s): "${questionHeadings[0].slice(0, 60)}"`
      : 'No question-based headings',
    recommendation: questionHeadings.length < 2
      ? 'Use question-based headings (e.g., "How does X work?") to target featured snippets and AI answer boxes'
      : null,
    weight: 0.20,
  })

  // Lists & tables for featured snippets
  const lists = $('ul, ol').length
  const tables = $('table').length
  checks.push({
    tag: 'lists-and-tables',
    status: lists + tables >= 2 ? 'pass' : lists + tables >= 1 ? 'warning' : 'warning',
    found: `${lists} list(s), ${tables} table(s)`,
    recommendation: lists + tables < 1
      ? 'Add bullet lists or tables — structured content is favored for featured snippets'
      : null,
    weight: 0.15,
  })

  // Concise answer paragraphs (≤50 words after a heading)
  let conciseAnswers = 0
  $('h2, h3').each((_, heading) => {
    const nextP = $(heading).next('p')
    if (nextP.length) {
      const words = nextP.text().trim().split(/\s+/).length
      if (words <= 50 && words >= 10) conciseAnswers++
    }
  })
  checks.push({
    tag: 'concise-answers',
    status: conciseAnswers >= 2 ? 'pass' : conciseAnswers >= 1 ? 'warning' : 'warning',
    found: `${conciseAnswers} concise answer paragraph(s) after headings`,
    recommendation: conciseAnswers < 1
      ? 'Add concise answer paragraphs (10–50 words) immediately after headings to target featured snippets'
      : null,
    weight: 0.20,
  })

  return checks
}
