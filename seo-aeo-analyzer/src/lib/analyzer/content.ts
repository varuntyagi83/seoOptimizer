import * as cheerio from 'cheerio'
import type { CheckItem } from '@/types/analysis'

export function analyzeContent(html: string): CheckItem[] {
  const $ = cheerio.load(html)
  const checks: CheckItem[] = []

  // H1 count — should be exactly 1
  const h1s = $('h1')
  const h1Count = h1s.length
  checks.push({
    tag: 'h1-count',
    status: h1Count === 1 ? 'pass' : h1Count === 0 ? 'fail' : 'warning',
    found: h1Count === 0 ? 'No H1' : `${h1Count} H1(s): "${h1s.first().text().trim().slice(0, 60)}"`,
    recommendation:
      h1Count === 0
        ? 'Add exactly one H1 tag that describes the page content'
        : h1Count > 1
        ? `Multiple H1s found — consolidate to one. Found: ${h1s.map((_, el) => `"${$(el).text().trim().slice(0, 30)}"`).toArray().join(', ')}`
        : null,
    weight: 0.20,
  })

  // Heading hierarchy (H1 > H2 > H3)
  const headings = $('h1, h2, h3, h4, h5, h6')
  let hierarchyOk = true
  let prevLevel = 0
  headings.each((_, el) => {
    const tagName = 'tagName' in el ? String(el.tagName) : ''
    const level = parseInt(tagName.replace('h', ''), 10)
    if (level > prevLevel + 1 && prevLevel !== 0) hierarchyOk = false
    prevLevel = level
  })
  checks.push({
    tag: 'heading-hierarchy',
    status: hierarchyOk ? 'pass' : 'warning',
    found: `${headings.length} heading(s) found`,
    recommendation: hierarchyOk ? null : 'Heading levels skip — use sequential order (H1 → H2 → H3)',
    weight: 0.10,
  })

  // Word count
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = bodyText.split(' ').filter(w => w.length > 0).length
  checks.push({
    tag: 'word-count',
    status: wordCount >= 300 ? 'pass' : wordCount >= 150 ? 'warning' : 'fail',
    found: `${wordCount} words`,
    recommendation:
      wordCount < 150
        ? 'Page has very little content — aim for at least 300 words'
        : wordCount < 300
        ? 'Content is thin — aim for 300+ words for better rankings'
        : null,
    weight: 0.20,
  })

  // Image alt text coverage
  const images = $('img')
  const totalImages = images.length
  const imagesWithAlt = images.filter((_, el) => {
    const alt = $(el).attr('alt')
    return alt !== undefined && alt.trim() !== ''
  }).length
  const altCoverage = totalImages === 0 ? 100 : Math.round((imagesWithAlt / totalImages) * 100)
  checks.push({
    tag: 'image-alt-text',
    status: totalImages === 0 ? 'pass' : altCoverage === 100 ? 'pass' : altCoverage >= 80 ? 'warning' : 'fail',
    found: totalImages === 0 ? 'No images' : `${imagesWithAlt}/${totalImages} images have alt text (${altCoverage}%)`,
    recommendation:
      altCoverage < 100 && totalImages > 0
        ? `Add descriptive alt text to ${totalImages - imagesWithAlt} image(s) for accessibility and SEO`
        : null,
    weight: 0.20,
  })

  // Internal links
  const internalLinks = $('a[href]').filter((_, el) => {
    const href = $(el).attr('href') ?? ''
    return href.startsWith('/') || href.startsWith('#')
  })
  checks.push({
    tag: 'internal-links',
    status: internalLinks.length >= 3 ? 'pass' : internalLinks.length >= 1 ? 'warning' : 'fail',
    found: `${internalLinks.length} internal link(s)`,
    recommendation:
      internalLinks.length < 1
        ? 'Add internal links to help crawlers and users navigate your site'
        : internalLinks.length < 3
        ? 'Consider adding more internal links to distribute link equity'
        : null,
    weight: 0.15,
  })

  // External links
  const externalLinks = $('a[href]').filter((_, el) => {
    const href = $(el).attr('href') ?? ''
    return href.startsWith('http') && !href.includes(new URL('https://example.com').hostname)
  })
  checks.push({
    tag: 'external-links',
    status: 'pass',
    found: `${externalLinks.length} external link(s)`,
    recommendation: null,
    weight: 0.15,
  })

  return checks
}
