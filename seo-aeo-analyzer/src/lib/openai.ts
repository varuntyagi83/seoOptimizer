import OpenAI from 'openai'
import type { SiteAnalysis, AIRecommendations, Recommendation } from '@/types/analysis'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an expert SEO and AEO (Answer Engine Optimization) consultant analyzing a multi-page website audit.

Your job is to analyze the full site data provided and return intelligent, actionable recommendations.

Focus on:
1. Site-wide patterns that affect multiple pages (template issues, structural problems)
2. Critical issues hurting rankings right now
3. AEO opportunities for AI answer engines (ChatGPT, Perplexity, Google SGE)
4. Quick wins — high impact, low effort fixes
5. Prioritization by business impact

Return a JSON object with this exact structure:
{
  "siteWide": [...],
  "critical": [...],
  "important": [...],
  "enhancements": [...],
  "quickWins": [...]
}

Each item must have:
{
  "title": "string",
  "description": "string",
  "action": "string (specific steps to implement)",
  "impact": "high" | "medium" | "low",
  "effort": "low" | "medium" | "high",
  "affectedPages": ["url1", "url2"] (optional),
  "codeSnippet": "string" (optional, include when helpful)
}

Be specific. Reference actual pages and actual issues found. Don't give generic advice.`

function buildUserPrompt(analysis: SiteAnalysis): string {
  const { domain, scores, stats, siteWideIssues, pages } = analysis

  // Worst pages by score (bottom 5)
  const worstPages = [...pages]
    .sort((a, b) => a.scores.overall - b.scores.overall)
    .slice(0, 5)
    .map(p => ({
      url: p.url,
      scores: p.scores,
      issues: [
        ...p.meta.filter(c => c.status !== 'pass').map(c => `meta/${c.tag}: ${c.found}`),
        ...p.content.filter(c => c.status !== 'pass').map(c => `content/${c.tag}: ${c.found}`),
        ...p.technical.filter(c => c.status !== 'pass').map(c => `technical/${c.tag}: ${c.found}`),
        ...p.aeo.filter(c => c.status !== 'pass').map(c => `aeo/${c.tag}: ${c.found}`),
      ].slice(0, 6),
    }))

  return `
SITE AUDIT REPORT
Domain: ${domain}
Pages crawled: ${stats.totalPages}

SCORES
Overall: ${scores.overall}/100
SEO: ${scores.seo}/100
AEO: ${scores.aeo}/100

SITE-WIDE STATS
- Avg load time: ${(stats.avgLoadTime / 1000).toFixed(2)}s
- Pages without H1: ${stats.pagesWithoutH1}/${stats.totalPages}
- Pages without meta description: ${stats.pagesWithoutDescription}/${stats.totalPages}
- Images without alt text (pages affected): ${stats.imagesWithoutAlt}
- Pages with structured data: ${stats.pagesWithStructuredData}/${stats.totalPages}
- Pages with FAQ schema: ${stats.pagesWithFaqSchema}/${stats.totalPages}

CRITICAL SITE-WIDE ISSUES
${siteWideIssues.critical.map(i => `- ${i.title}: ${i.description} (affects ${i.count} pages)`).join('\n') || 'None'}

WARNINGS
${siteWideIssues.warnings.map(i => `- ${i.title}: ${i.description} (affects ${i.count} pages)`).join('\n') || 'None'}

OPPORTUNITIES
${siteWideIssues.opportunities.map(i => `- ${i.title}: ${i.description} (affects ${i.count} pages)`).join('\n') || 'None'}

WORST PERFORMING PAGES
${worstPages.map(p => `
URL: ${p.url}
Scores: Overall ${p.scores.overall}, SEO ${p.scores.seo}, AEO ${p.scores.aeo}
Issues: ${p.issues.join(' | ') || 'None'}
`).join('')}

Generate 3-5 recommendations per category. Be specific and actionable.
`.trim()
}

function parseRecommendations(raw: Record<string, unknown>): AIRecommendations {
  function parseList(arr: unknown): Recommendation[] {
    if (!Array.isArray(arr)) return []
    return arr.map((item: unknown) => {
      const i = item as Record<string, unknown>
      return {
        title: String(i.title ?? ''),
        description: String(i.description ?? ''),
        action: String(i.action ?? ''),
        impact: (['high', 'medium', 'low'].includes(String(i.impact)) ? i.impact : 'medium') as 'high' | 'medium' | 'low',
        effort: (['low', 'medium', 'high'].includes(String(i.effort)) ? i.effort : 'medium') as 'low' | 'medium' | 'high',
        affectedPages: Array.isArray(i.affectedPages) ? i.affectedPages.map(String) : undefined,
        codeSnippet: i.codeSnippet ? String(i.codeSnippet) : undefined,
      }
    })
  }

  return {
    siteWide: parseList(raw.siteWide),
    critical: parseList(raw.critical),
    important: parseList(raw.important),
    enhancements: parseList(raw.enhancements),
    quickWins: parseList(raw.quickWins),
  }
}

export async function generateRecommendations(analysis: SiteAnalysis): Promise<AIRecommendations> {
  const response = await client.chat.completions.create({
    model: 'gpt-4.1',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(analysis) },
    ],
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as Record<string, unknown>
  return parseRecommendations(parsed)
}
