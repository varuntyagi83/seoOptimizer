import OpenAI from 'openai'
import type { SiteAnalysis, AIRecommendations, Recommendation, PageRecommendation, ExecutiveSummary } from '@/types/analysis'

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const SYSTEM_PROMPT = `You are a senior SEO and AEO (Answer Engine Optimization) consultant delivering a comprehensive website audit report.

Analyze ALL pages provided and return a detailed, specific assessment. Reference actual URLs, actual issue values, and real data from the audit.

Return a JSON object with this exact structure:
{
  "executiveSummary": {
    "narrative": "2-3 sentence overview of the site's SEO/AEO health, key strengths, and biggest weakness. Be specific.",
    "scoreContext": "What the overall score means — e.g. 'A score of 79 places this site in the top 40% of content sites but trails enterprise blogs by ~15 points. Fixing [X] alone could push you to 88+'",
    "biggestWin": "The single most impactful action the user should take first, in one sentence."
  },
  "siteWide": [...],
  "critical": [...],
  "important": [...],
  "quickWins": [...],
  "enhancements": [...],
  "pageSpecific": [
    {
      "url": "full url",
      "priority": 1,
      "scoreBreakdown": { "seo": 0, "aeo": 0, "overall": 0 },
      "topIssues": ["issue 1", "issue 2", "issue 3"],
      "fixes": ["specific fix 1", "specific fix 2", "specific fix 3"]
    }
  ]
}

Each item in siteWide/critical/important/quickWins/enhancements must have:
{
  "title": "string",
  "description": "string — explain WHY this matters with specifics from the data",
  "action": "string — step-by-step implementation instructions, not generic advice",
  "impact": "high" | "medium" | "low",
  "effort": "low" | "medium" | "high",
  "affectedPages": ["url1", "url2"],
  "codeSnippet": "string (include whenever a template, schema, or code fix applies)"
}

Rules:
- pageSpecific: include the 5 lowest-scoring pages, sorted by priority (1 = worst). Each needs 3 topIssues and 3 specific fixes.
- Generate 4-5 items per category (siteWide, critical, important, quickWins, enhancements).
- Never give generic advice. Every recommendation must reference actual data from this report.
- For AEO, focus on: FAQ schema, structured data, direct-answer formatting, citation-worthy content.`

function buildUserPrompt(analysis: SiteAnalysis): string {
  const { domain, scores, stats, siteWideIssues, pages } = analysis

  // Score context thresholds
  const scoreToNext = scores.overall < 90
    ? `(${90 - scores.overall} points to reach 90)`
    : scores.overall < 95
    ? `(${95 - scores.overall} points to reach 95)`
    : '(excellent)'

  // All pages sorted worst-first for full context
  const allPagesSorted = [...pages].sort((a, b) => a.scores.overall - b.scores.overall)

  // Full page data — all issues, no truncation
  const allPagesData = allPagesSorted.map(p => {
    const issues = [
      ...p.meta.filter(c => c.status !== 'pass').map(c => `meta/${c.tag}: ${c.found}`),
      ...p.content.filter(c => c.status !== 'pass').map(c => `content/${c.tag}: ${c.found}`),
      ...p.technical.filter(c => c.status !== 'pass').map(c => `technical/${c.tag}: ${c.found}`),
      ...p.aeo.filter(c => c.status !== 'pass').map(c => `aeo/${c.tag}: ${c.found}`),
    ]
    return `URL: ${p.url}
Scores: Overall ${p.scores.overall} | SEO ${p.scores.seo} | AEO ${p.scores.aeo}
Issues (${issues.length}): ${issues.join(' | ') || 'none'}`
  }).join('\n\n')

  // Issue frequency map across all pages
  const issueFreq: Record<string, number> = {}
  for (const p of pages) {
    for (const c of [...p.meta, ...p.content, ...p.technical, ...p.aeo]) {
      if (c.status !== 'pass') {
        issueFreq[c.tag] = (issueFreq[c.tag] ?? 0) + 1
      }
    }
  }
  const topIssues = Object.entries(issueFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => `${tag} (${count}/${pages.length} pages)`)
    .join(', ')

  return `SITE AUDIT REPORT
Domain: ${domain}
Pages crawled: ${stats.totalPages}
Analysis date: ${new Date().toISOString().split('T')[0]}

SCORES
Overall: ${scores.overall}/100 ${scoreToNext}
SEO:     ${scores.seo}/100
AEO:     ${scores.aeo}/100

SITE-WIDE STATS
- Avg load time: ${(stats.avgLoadTime / 1000).toFixed(2)}s
- Pages without H1: ${stats.pagesWithoutH1}/${stats.totalPages}
- Pages without meta description: ${stats.pagesWithoutDescription}/${stats.totalPages}
- Images without alt text (pages affected): ${stats.imagesWithoutAlt}
- Pages with structured data: ${stats.pagesWithStructuredData}/${stats.totalPages}
- Pages with FAQ schema: ${stats.pagesWithFaqSchema}/${stats.totalPages}

TOP RECURRING ISSUES (by frequency across all pages)
${topIssues}

CRITICAL SITE-WIDE ISSUES
${siteWideIssues.critical.map(i => `- ${i.title}: ${i.description} (affects ${i.count} pages)`).join('\n') || 'None'}

WARNINGS
${siteWideIssues.warnings.map(i => `- ${i.title}: ${i.description} (affects ${i.count} pages)`).join('\n') || 'None'}

OPPORTUNITIES
${siteWideIssues.opportunities.map(i => `- ${i.title}: ${i.description} (affects ${i.count} pages)`).join('\n') || 'None'}

ALL PAGES (sorted worst to best)
${allPagesData}

Generate the full assessment per the JSON schema. Be specific — reference actual URLs and actual issue values.`.trim()
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

  function parsePageSpecific(arr: unknown): PageRecommendation[] {
    if (!Array.isArray(arr)) return []
    return arr.map((item: unknown) => {
      const i = item as Record<string, unknown>
      const sb = (i.scoreBreakdown ?? {}) as Record<string, unknown>
      return {
        url: String(i.url ?? ''),
        priority: Number(i.priority ?? 0),
        scoreBreakdown: {
          seo: Number(sb.seo ?? 0),
          aeo: Number(sb.aeo ?? 0),
          overall: Number(sb.overall ?? 0),
        },
        topIssues: Array.isArray(i.topIssues) ? i.topIssues.map(String) : [],
        fixes: Array.isArray(i.fixes) ? i.fixes.map(String) : [],
      }
    }).sort((a, b) => a.priority - b.priority)
  }

  function parseExecutiveSummary(raw: unknown): ExecutiveSummary {
    const e = (raw ?? {}) as Record<string, unknown>
    return {
      narrative: String(e.narrative ?? ''),
      scoreContext: String(e.scoreContext ?? ''),
      biggestWin: String(e.biggestWin ?? ''),
    }
  }

  return {
    executiveSummary: parseExecutiveSummary(raw.executiveSummary),
    siteWide: parseList(raw.siteWide),
    critical: parseList(raw.critical),
    important: parseList(raw.important),
    enhancements: parseList(raw.enhancements),
    quickWins: parseList(raw.quickWins),
    pageSpecific: parsePageSpecific(raw.pageSpecific),
  }
}

export async function generateRecommendations(analysis: SiteAnalysis): Promise<AIRecommendations> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4.1',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(analysis) },
    ],
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as Record<string, unknown>
  return parseRecommendations(parsed)
}
