import { v4 as uuidv4 } from 'uuid'
import type { CrawledPage } from '@/types/crawler'
import type { CrawlConfig } from '@/types/crawler'
import type { PageAnalysis, SiteAnalysis, SiteIssue, CheckItem } from '@/types/analysis'

function pct(count: number, total: number): number {
  return total === 0 ? 0 : count / total
}

function findSiteWideIssues(pages: PageAnalysis[], crawledPages: CrawledPage[]): SiteAnalysis['siteWideIssues'] {
  const total = pages.length
  const critical: SiteIssue[] = []
  const warnings: SiteIssue[] = []
  const opportunities: SiteIssue[] = []

  // Helper: find pages where a specific check fails or warns
  function affectedBy(tag: string, status: 'fail' | 'warning', allChecks: (p: PageAnalysis) => CheckItem[]) {
    return pages.filter(p => allChecks(p).some(c => c.tag === tag && c.status === status)).map(p => p.url)
  }

  // Missing meta description (>50% = critical, 20-50% = warning)
  const noDesc = affectedBy('meta-description', 'fail', p => p.meta)
  if (pct(noDesc.length, total) > 0.5) {
    critical.push({ type: 'missing-description', severity: 'critical', title: 'Missing Meta Descriptions', description: `${noDesc.length} of ${total} pages have no meta description`, affectedPages: noDesc, count: noDesc.length, recommendation: 'Add unique meta descriptions to all pages (120–160 chars)' })
  } else if (pct(noDesc.length, total) > 0.2) {
    warnings.push({ type: 'missing-description', severity: 'warning', title: 'Missing Meta Descriptions', description: `${noDesc.length} pages missing meta descriptions`, affectedPages: noDesc, count: noDesc.length, recommendation: 'Add meta descriptions to improve CTR from search results' })
  }

  // Missing/multiple H1
  const noH1 = pages.filter(p => p.content.some(c => c.tag === 'h1-count' && c.status === 'fail')).map(p => p.url)
  const multiH1 = pages.filter(p => p.content.some(c => c.tag === 'h1-count' && c.status === 'warning')).map(p => p.url)
  if (pct(noH1.length, total) > 0.5) {
    critical.push({ type: 'missing-h1', severity: 'critical', title: 'Missing H1 Tags', description: `${noH1.length} pages have no H1 tag`, affectedPages: noH1, count: noH1.length, recommendation: 'Add a descriptive H1 to every page' })
  } else if (noH1.length + multiH1.length > 0) {
    warnings.push({ type: 'h1-issues', severity: 'warning', title: 'H1 Tag Issues', description: `${noH1.length} pages missing H1, ${multiH1.length} pages have multiple H1s`, affectedPages: [...noH1, ...multiH1], count: noH1.length + multiH1.length, recommendation: 'Ensure each page has exactly one H1 tag' })
  }

  // No structured data (>50% = critical)
  const noSchema = affectedBy('structured-data', 'warning', p => p.technical)
  if (pct(noSchema.length, total) > 0.5) {
    critical.push({ type: 'no-structured-data', severity: 'critical', title: 'No Structured Data', description: `${noSchema.length} of ${total} pages lack structured data`, affectedPages: noSchema, count: noSchema.length, recommendation: 'Add JSON-LD structured data to all major pages' })
  }

  // Slow pages (>4s)
  const slowPages = pages.filter(p => p.technical.some(c => c.tag === 'load-time' && c.status === 'fail')).map(p => p.url)
  if (slowPages.length > 0) {
    warnings.push({ type: 'slow-pages', severity: 'warning', title: 'Slow Page Load Times', description: `${slowPages.length} pages load in >4 seconds`, affectedPages: slowPages, count: slowPages.length, recommendation: 'Optimize images, leverage caching, and use a CDN' })
  }

  // No FAQ schema (opportunity)
  const noFaq = affectedBy('faq-schema', 'warning', p => p.aeo)
  const pagesWithQHeadings = pages.filter(p => p.aeo.some(c => c.tag === 'question-headings' && (c.status === 'pass' || c.status === 'warning'))).map(p => p.url)
  const faqOpportunities = noFaq.filter(url => pagesWithQHeadings.includes(url))
  if (faqOpportunities.length > 0) {
    opportunities.push({ type: 'faq-schema-opportunity', severity: 'info', title: 'FAQ Schema Opportunities', description: `${faqOpportunities.length} pages have Q&A content but no FAQPage schema`, affectedPages: faqOpportunities, count: faqOpportunities.length, recommendation: 'Add FAQPage JSON-LD schema to capture FAQ rich results' })
  }

  // Thin content
  const thinContent = affectedBy('word-count', 'fail', p => p.content)
  if (thinContent.length > 0) {
    warnings.push({ type: 'thin-content', severity: 'warning', title: 'Thin Content Pages', description: `${thinContent.length} pages have fewer than 150 words`, affectedPages: thinContent, count: thinContent.length, recommendation: 'Expand content on these pages to at least 300 words' })
  }

  void crawledPages
  return { critical, warnings, opportunities }
}

export function aggregateSiteAnalysis(
  pageAnalyses: PageAnalysis[],
  crawledPages: CrawledPage[],
  config: CrawlConfig
): SiteAnalysis {
  const domain = new URL(config.startUrl).hostname

  // Weighted scores — depth-0 pages count more
  const weightedScores = pageAnalyses.map(p => ({
    weight: p.depth === 0 ? 3 : p.depth === 1 ? 2 : 1,
    scores: p.scores,
  }))
  const totalWeight = weightedScores.reduce((s, p) => s + p.weight, 0)
  const overall = Math.round(weightedScores.reduce((s, p) => s + p.scores.overall * p.weight, 0) / (totalWeight || 1))
  const seo = Math.round(weightedScores.reduce((s, p) => s + p.scores.seo * p.weight, 0) / (totalWeight || 1))
  const aeo = Math.round(weightedScores.reduce((s, p) => s + p.scores.aeo * p.weight, 0) / (totalWeight || 1))

  // Stats
  const avgLoadTime = crawledPages.length > 0
    ? Math.round(crawledPages.reduce((s, p) => s + p.loadTime, 0) / crawledPages.length)
    : 0

  const pagesWithoutH1 = pageAnalyses.filter(p => p.content.some(c => c.tag === 'h1-count' && c.status === 'fail')).length
  const pagesWithoutDescription = pageAnalyses.filter(p => p.meta.some(c => c.tag === 'meta-description' && c.status === 'fail')).length
  const imagesWithoutAlt = pageAnalyses.filter(p => p.content.some(c => c.tag === 'image-alt-text' && c.status !== 'pass')).length
  const pagesWithStructuredData = pageAnalyses.filter(p => p.technical.some(c => c.tag === 'structured-data' && c.status === 'pass')).length
  const pagesWithFaqSchema = pageAnalyses.filter(p => p.aeo.some(c => c.tag === 'faq-schema' && c.status === 'pass')).length

  return {
    id: uuidv4(),
    domain,
    startUrl: config.startUrl,
    crawlConfig: config,
    crawledAt: new Date(),
    completedAt: new Date(),
    scores: { overall, seo, aeo },
    pages: pageAnalyses,
    siteWideIssues: findSiteWideIssues(pageAnalyses, crawledPages),
    stats: {
      totalPages: pageAnalyses.length,
      avgLoadTime,
      pagesWithoutH1,
      pagesWithoutDescription,
      imagesWithoutAlt,
      pagesWithStructuredData,
      pagesWithFaqSchema,
    },
  }
}
