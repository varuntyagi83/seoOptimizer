import type { CrawledPage } from '@/types/crawler'
import type { PageAnalysis } from '@/types/analysis'
import { analyzeMeta } from './meta'
import { analyzeContent } from './content'
import { analyzeTechnical } from './technical'
import { analyzeAeo } from './aeo'
import { calculateScores } from '@/lib/scoring'

export async function analyzePage(page: CrawledPage): Promise<PageAnalysis> {
  const meta = analyzeMeta(page.html, page.url)
  const content = analyzeContent(page.html)
  const technical = analyzeTechnical(page)
  const aeo = analyzeAeo(page.html)
  const scores = calculateScores(meta, content, technical, aeo)

  return {
    url: page.url,
    depth: page.depth,
    scores,
    meta,
    content,
    technical,
    aeo,
  }
}

export async function analyzePages(
  pages: CrawledPage[],
  concurrency = 4,
  onProgress?: (completed: number, total: number, url: string) => void
): Promise<PageAnalysis[]> {
  const results: PageAnalysis[] = []
  const total = pages.length

  // Process in batches for concurrency
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (page) => {
        const result = await analyzePage(page)
        // Free HTML string from memory — not needed after analysis
        page.html = ''
        onProgress?.(results.length + 1, total, page.url)
        return result
      })
    )
    results.push(...batchResults)
  }

  return results
}
