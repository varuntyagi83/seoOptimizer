import * as cheerio from 'cheerio'
import type { CrawledPage } from '@/types/crawler'
import type { CheckItem } from '@/types/analysis'

export function analyzeTechnical(page: CrawledPage): CheckItem[] {
  const $ = cheerio.load(page.html)
  const checks: CheckItem[] = []

  // HTTPS
  const isHttps = page.url.startsWith('https://')
  checks.push({
    tag: 'https',
    status: isHttps ? 'pass' : 'fail',
    found: isHttps ? 'HTTPS enabled' : 'HTTP (insecure)',
    recommendation: isHttps ? null : 'Migrate to HTTPS — required for security and SEO rankings',
    weight: 0.20,
  })

  // Load time
  const loadTime = page.loadTime
  checks.push({
    tag: 'load-time',
    status: loadTime <= 2000 ? 'pass' : loadTime <= 4000 ? 'warning' : 'fail',
    found: `${(loadTime / 1000).toFixed(2)}s`,
    recommendation:
      loadTime > 4000
        ? 'Page load time is very slow (>4s) — optimize images, enable caching, use a CDN'
        : loadTime > 2000
        ? 'Page load time is slow (>2s) — consider performance optimizations'
        : null,
    weight: 0.20,
  })

  // HTTP status code
  checks.push({
    tag: 'status-code',
    status: page.statusCode === 200 ? 'pass' : page.statusCode >= 300 && page.statusCode < 400 ? 'warning' : 'fail',
    found: `HTTP ${page.statusCode}`,
    recommendation:
      page.statusCode >= 400
        ? `Page returned ${page.statusCode} — fix or redirect this URL`
        : page.statusCode >= 300
        ? `Page redirects (${page.statusCode}) — update links to point directly to the final URL`
        : null,
    weight: 0.20,
  })

  // Structured data (JSON-LD or microdata)
  const jsonLdScripts = $('script[type="application/ld+json"]')
  const hasStructuredData = jsonLdScripts.length > 0 || $('[itemscope]').length > 0
  const schemaTypes: string[] = []
  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}')
      const type = data['@type'] ?? (Array.isArray(data['@graph']) ? data['@graph'].map((g: Record<string, unknown>) => g['@type']).join(', ') : null)
      if (type) schemaTypes.push(type)
    } catch {
      // Invalid JSON-LD
    }
  })
  checks.push({
    tag: 'structured-data',
    status: hasStructuredData ? 'pass' : 'warning',
    found: hasStructuredData ? `Found: ${schemaTypes.join(', ') || 'microdata'}` : 'No structured data',
    recommendation: hasStructuredData
      ? null
      : 'Add JSON-LD structured data (Organization, WebPage, BreadcrumbList) to improve rich results',
    weight: 0.40,
  })

  return checks
}
