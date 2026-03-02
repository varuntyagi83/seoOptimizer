import * as cheerio from 'cheerio'
import type { CheckItem } from '@/types/analysis'

export function analyzeMeta(html: string, url: string): CheckItem[] {
  const $ = cheerio.load(html)
  const checks: CheckItem[] = []

  // Title tag
  const title = $('title').first().text().trim()
  const titleLen = title.length
  checks.push({
    tag: 'title',
    status: !title ? 'fail' : titleLen < 50 || titleLen > 60 ? 'warning' : 'pass',
    found: title ? `"${title}" (${titleLen} chars)` : 'Missing',
    recommendation: !title
      ? 'Add a descriptive title tag (50–60 characters)'
      : titleLen < 50
      ? 'Title is too short — aim for 50–60 characters'
      : titleLen > 60
      ? 'Title is too long — keep under 60 characters to avoid truncation'
      : null,
    weight: 0.20,
  })

  // Meta description
  const desc = $('meta[name="description"]').attr('content')?.trim() ?? ''
  const descLen = desc.length
  checks.push({
    tag: 'meta-description',
    status: !desc ? 'fail' : descLen < 120 || descLen > 160 ? 'warning' : 'pass',
    found: desc ? `"${desc.slice(0, 60)}…" (${descLen} chars)` : 'Missing',
    recommendation: !desc
      ? 'Add a meta description (120–160 characters)'
      : descLen < 120
      ? 'Description is too short — aim for 120–160 characters'
      : descLen > 160
      ? 'Description is too long — keep under 160 characters'
      : null,
    weight: 0.20,
  })

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? ''
  checks.push({
    tag: 'canonical',
    status: canonical ? 'pass' : 'warning',
    found: canonical || 'Missing',
    recommendation: canonical ? null : 'Add a canonical URL to prevent duplicate content issues',
    weight: 0.10,
  })

  // Viewport
  const viewport = $('meta[name="viewport"]').attr('content')?.trim() ?? ''
  checks.push({
    tag: 'viewport',
    status: viewport ? 'pass' : 'fail',
    found: viewport || 'Missing',
    recommendation: viewport ? null : 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    weight: 0.05,
  })

  // Robots meta
  const robots = $('meta[name="robots"]').attr('content')?.trim() ?? ''
  const isNoindex = robots.toLowerCase().includes('noindex')
  checks.push({
    tag: 'robots-meta',
    status: isNoindex ? 'warning' : 'pass',
    found: robots || 'Not set (defaults to index, follow)',
    recommendation: isNoindex ? 'Page is set to noindex — intentional?' : null,
    weight: 0.05,
  })

  // OG: title
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() ?? ''
  checks.push({
    tag: 'og:title',
    status: ogTitle ? 'pass' : 'warning',
    found: ogTitle || 'Missing',
    recommendation: ogTitle ? null : 'Add og:title for better social sharing previews',
    weight: 0.10,
  })

  // OG: description
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() ?? ''
  checks.push({
    tag: 'og:description',
    status: ogDesc ? 'pass' : 'warning',
    found: ogDesc || 'Missing',
    recommendation: ogDesc ? null : 'Add og:description for social sharing',
    weight: 0.10,
  })

  // OG: image
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() ?? ''
  checks.push({
    tag: 'og:image',
    status: ogImage ? 'pass' : 'warning',
    found: ogImage || 'Missing',
    recommendation: ogImage ? null : 'Add og:image (1200×630px recommended)',
    weight: 0.10,
  })

  // Twitter card
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() ?? ''
  checks.push({
    tag: 'twitter:card',
    status: twitterCard ? 'pass' : 'warning',
    found: twitterCard || 'Missing',
    recommendation: twitterCard ? null : 'Add twitter:card meta tag for Twitter sharing previews',
    weight: 0.10,
  })

  void url
  return checks
}
