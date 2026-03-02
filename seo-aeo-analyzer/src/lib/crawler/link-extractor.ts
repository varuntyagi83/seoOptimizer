import * as cheerio from 'cheerio'
import { normalizeUrl, shouldSkipUrl } from './queue'

export interface ExtractedLink {
  url: string
  text: string
  context: 'nav' | 'content' | 'footer' | 'other'
}

type CheerioRoot = ReturnType<typeof cheerio.load>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContext(el: any, $: CheerioRoot): 'nav' | 'content' | 'footer' | 'other' {
  const parents = $(el).parents().toArray()
  for (const parent of parents) {
    const tag = 'tagName' in parent ? String(parent.tagName).toLowerCase() : ''
    const role = $(parent).attr('role')
    if (tag === 'nav' || role === 'navigation') return 'nav'
    if (tag === 'footer' || role === 'contentinfo') return 'footer'
    if (tag === 'main' || tag === 'article' || tag === 'section') return 'content'
  }
  return 'other'
}

export function extractLinks(html: string, baseUrl: string): {
  internal: ExtractedLink[]
  external: string[]
} {
  const $ = cheerio.load(html)
  const base = new URL(baseUrl)
  const internal: ExtractedLink[] = []
  const external: string[] = []
  const seen = new Set<string>()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

    try {
      const resolved = new URL(href, baseUrl)

      // Only http/https
      if (!['http:', 'https:'].includes(resolved.protocol)) return

      const normalized = normalizeUrl(resolved.toString())
      if (seen.has(normalized)) return
      seen.add(normalized)

      if (shouldSkipUrl(normalized)) return

      if (resolved.hostname === base.hostname) {
        internal.push({
          url: normalized,
          text: $(el).text().trim().slice(0, 100),
          context: getContext(el, $),
        })
      } else {
        external.push(normalized)
      }
    } catch {
      // Invalid URL — skip
    }
  })

  return { internal, external }
}
