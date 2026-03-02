# Claude Code Prompts - SEO & AEO Analyzer

> Copy each prompt into Claude Code in sequence. Test after each phase.

---

## Phase 1: Project Setup

### 1.1 Initialize Project

```
Create a Next.js 14 SEO & AEO Analyzer with multi-page crawling:

1. Initialize: npx create-next-app@latest seo-aeo-analyzer --typescript --tailwind --eslint --app --src-dir

2. Install dependencies:
   - openai (GPT-4.1 API)
   - cheerio (HTML parsing)
   - @supabase/supabase-js (database)
   - lucide-react (icons)
   - framer-motion (animations)
   - zod (validation)
   - p-limit (concurrency control)
   - p-retry (retry logic)
   - eventemitter3 (event-driven updates)

3. Set up shadcn/ui: button, input, card, tabs, badge, skeleton, progress, alert, slider

4. Create the folder structure from README.md

5. Create .env.local with placeholders for:
   OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
```

### 1.2 TypeScript Types - Crawler

```
Create src/types/crawler.ts:

interface CrawlConfig {
  startUrl: string
  maxPages: number           // 10, 25, 50, 100
  maxDepth: number           // 1, 2, 3
  respectRobotsTxt: boolean
  includeSitemap: boolean
  concurrency: number        // default 3
  timeout: number            // default 15000ms
}

interface CrawlJob {
  url: string
  depth: number
  priority: number           // lower = higher priority
  parentUrl: string | null
  status: 'pending' | 'crawling' | 'complete' | 'failed'
  retries: number
  error?: string
}

interface CrawlProgress {
  total: number
  completed: number
  failed: number
  currentUrl: string | null
  pagesPerSecond: number
  estimatedTimeRemaining: number
}

interface CrawledPage {
  url: string
  finalUrl: string           // after redirects
  statusCode: number
  contentType: string
  html: string
  loadTime: number
  depth: number
  internalLinks: string[]
  externalLinks: string[]
  fetchedAt: Date
}

Export all interfaces.
```

### 1.3 TypeScript Types - Analysis

```
Create src/types/analysis.ts:

interface PageAnalysis {
  url: string
  depth: number
  scores: {
    overall: number
    seo: number
    aeo: number
  }
  meta: CheckItem[]
  content: CheckItem[]
  technical: CheckItem[]
  aeo: CheckItem[]
}

interface SiteAnalysis {
  id: string
  domain: string
  startUrl: string
  crawlConfig: CrawlConfig
  crawledAt: Date
  completedAt: Date
  
  scores: {
    overall: number
    seo: number
    aeo: number
  }
  
  pages: PageAnalysis[]
  
  siteWideIssues: {
    critical: SiteIssue[]
    warnings: SiteIssue[]
    opportunities: SiteIssue[]
  }
  
  stats: {
    totalPages: number
    avgLoadTime: number
    totalWordCount: number
    avgWordCount: number
    pagesWithoutH1: number
    pagesWithMultipleH1: number
    pagesWithoutDescription: number
    pagesWithShortDescription: number
    imagesTotal: number
    imagesWithoutAlt: number
    pagesWithStructuredData: number
    pagesWithFaqSchema: number
    pagesWithHowToSchema: number
    avgInternalLinks: number
    orphanPages: number
  }
  
  aiRecommendations?: AIRecommendations
}

interface SiteIssue {
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  affectedPages: string[]
  count: number
  recommendation: string
}

interface CheckItem {
  tag: string
  status: 'pass' | 'warning' | 'fail'
  found: string
  expected?: string
  recommendation: string | null
  weight: number
}

interface AIRecommendations {
  siteWide: Recommendation[]
  critical: Recommendation[]
  important: Recommendation[]
  enhancements: Recommendation[]
  quickWins: Recommendation[]
}

interface Recommendation {
  title: string
  description: string
  action: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  affectedPages?: string[]
  codeSnippet?: string
}

Export all interfaces.
```

### 1.4 TypeScript Types - Orchestrator

```
Create src/types/orchestrator.ts:

type OrchestratorState = 
  | 'idle'
  | 'initializing'
  | 'crawling'
  | 'analyzing'
  | 'aggregating'
  | 'ai-processing'
  | 'complete'
  | 'error'
  | 'cancelled'

interface StateTransition {
  from: OrchestratorState
  to: OrchestratorState
  timestamp: Date
}

interface OrchestratorEvent {
  type: 'state-change' | 'crawl-progress' | 'page-analyzed' | 'error' | 'complete'
  payload: any
  timestamp: Date
}

interface OrchestratorContext {
  config: CrawlConfig
  state: OrchestratorState
  progress: CrawlProgress
  crawledPages: CrawledPage[]
  pageAnalyses: PageAnalysis[]
  siteAnalysis: SiteAnalysis | null
  errors: OrchestratorError[]
  startedAt: Date | null
  completedAt: Date | null
}

interface OrchestratorError {
  phase: OrchestratorState
  url?: string
  message: string
  stack?: string
  retryable: boolean
  timestamp: Date
}

Export all types and interfaces.
```

---

## Phase 2: Crawler with Circuit Breaker

### 2.1 Priority Queue

```
Create src/lib/crawler/queue.ts:

A priority queue for managing crawl jobs:

Class CrawlQueue:

Private state:
- pending: Map<string, CrawlJob> (keyed by normalized URL)
- completed: Map<string, CrawlJob>
- failed: Map<string, CrawlJob>
- maxPages: number

Constructor(maxPages: number)

Methods:

normalizeUrl(url: string): string
  - Remove trailing slashes
  - Remove fragments (#...)
  - Remove tracking params (utm_*, fbclid, gclid, etc.)
  - Sort remaining query params
  - Lowercase hostname
  - Return normalized URL

enqueue(job: CrawlJob): boolean
  - Normalize the URL
  - Check if already in pending, completed, or failed
  - Check if maxPages reached
  - Add to pending map
  - Return true if added, false if skipped

dequeue(): CrawlJob | null
  - Get all pending jobs
  - Sort by priority (ascending)
  - Remove and return first job
  - Return null if empty

has(url: string): boolean
  - Check if URL exists in any map (pending, completed, failed)

markComplete(url: string, job: CrawlJob): void
  - Remove from pending
  - Add to completed

markFailed(url: string, job: CrawlJob, error: string): void
  - Remove from pending
  - Add job with error to failed

size(): number - return pending.size
getPending(): CrawlJob[]
getCompleted(): CrawlJob[]
getFailed(): CrawlJob[]
getTotalProcessed(): number - completed + failed count

shouldContinue(): boolean
  - Return true if pending.size > 0 AND totalProcessed < maxPages

Export the CrawlQueue class.
```

### 2.2 Fetcher with Circuit Breaker

```
Create src/lib/crawler/fetcher.ts:

HTTP fetcher with circuit breaker and retry logic:

Types:
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

Interface FetcherConfig:
  timeout: number (default 15000)
  maxRetries: number (default 3)
  retryDelay: number (default 1000)
  userAgents: string[] (array of UA strings to rotate)

Class CircuitBreaker:
  Private:
    state: CircuitState = 'CLOSED'
    failures: number = 0
    successesInHalfOpen: number = 0
    lastFailureTime: Date | null
    failureThreshold: number = 5
    resetTimeout: number = 30000
    halfOpenSuccessThreshold: number = 3

  Methods:
    canRequest(): boolean
      - If CLOSED: return true
      - If OPEN: check if resetTimeout passed, if so move to HALF_OPEN
      - If HALF_OPEN: return true
    
    recordSuccess(): void
      - If HALF_OPEN: increment successes, close if threshold met
      - If CLOSED: reset failures
    
    recordFailure(): void
      - Increment failures
      - If threshold reached: open circuit
    
    getState(): CircuitState

Class Fetcher:
  Private:
    config: FetcherConfig
    circuitBreaker: CircuitBreaker
    requestCount: number = 0

  Constructor(config: Partial<FetcherConfig>)

  async fetch(url: string): Promise<CrawledPage>
    - Check circuit breaker
    - If OPEN, throw CircuitOpenError
    
    - Use p-retry with config:
      retries: maxRetries
      onFailedAttempt: log attempt number
      shouldRetry: (error) => 
        - Return true for: timeout, 5xx, network errors
        - Return false for: 4xx (except 429)
        - On 429: wait for Retry-After header
    
    - Fetch with:
      - Rotating User-Agent
      - timeout via AbortController
      - Follow redirects (max 5)
      - Record start time for loadTime
    
    - On success:
      - circuitBreaker.recordSuccess()
      - Parse response
      - Return CrawledPage with:
        url, finalUrl (after redirects), statusCode, contentType,
        html, loadTime, fetchedAt
    
    - On failure:
      - circuitBreaker.recordFailure()
      - Throw appropriate error

  getCircuitState(): CircuitState

Export Fetcher class and CircuitOpenError.
```

### 2.3 Link Extractor

```
Create src/lib/crawler/link-extractor.ts:

Extract and filter internal links from HTML:

interface ExtractedLink {
  url: string
  anchor: string
  context: 'nav' | 'header' | 'footer' | 'sidebar' | 'content'
  priority: number
}

function extractLinks(html: string, baseUrl: string): ExtractedLink[]

Steps:
1. Parse HTML with Cheerio
2. Get base URL's hostname for same-domain check

3. Find all <a href="..."> elements
   For each:
   - Get href attribute
   - Skip if empty, javascript:, mailto:, tel:, #
   - Resolve relative URLs against baseUrl
   - Skip if different domain
   - Skip file extensions: .pdf, .jpg, .jpeg, .png, .gif, .svg, .css, .js, .xml, .zip, .doc, .xls
   - Skip paths: /wp-admin, /wp-content/uploads, /cdn-cgi, /cart, /checkout, /login, /logout, /admin

4. Determine context and priority:
   - Inside <nav> or <header>: context='nav', priority=1
   - Inside <aside> or .sidebar: context='sidebar', priority=3
   - Inside <footer>: context='footer', priority=4
   - Otherwise: context='content', priority=2

5. Get anchor text (trimmed, max 100 chars)

6. Deduplicate by URL

7. Return ExtractedLink array sorted by priority

function normalizeUrl(url: string): string
  - Same logic as queue normalizeUrl
  - Export separately for reuse

Export extractLinks and normalizeUrl.
```

### 2.4 Main Crawler

```
Create src/lib/crawler/index.ts:

Main crawler that orchestrates the crawl:

Import: CrawlQueue, Fetcher, extractLinks, and all types
Import: pLimit from 'p-limit'
Import: EventEmitter from 'eventemitter3'

Class SiteCrawler extends EventEmitter:

Private:
  config: CrawlConfig
  queue: CrawlQueue
  fetcher: Fetcher
  pages: CrawledPage[] = []
  isRunning: boolean = false
  isCancelled: boolean = false
  startTime: Date | null = null

Constructor(config: CrawlConfig)
  - Initialize queue with config.maxPages
  - Initialize fetcher with config.timeout
  - Store config

async *start(): AsyncGenerator<CrawlProgress>
  - Set isRunning = true, startTime = now
  - Enqueue start URL with depth=0, priority=0
  
  - If config.includeSitemap:
    - Try to fetch /sitemap.xml
    - Parse and enqueue URLs with depth=1, priority=1
    - Emit 'sitemap-loaded' event
  
  - If config.respectRobotsTxt:
    - Try to fetch /robots.txt
    - Store disallowed paths for filtering
    - Emit 'robots-loaded' event
  
  - Create limiter = pLimit(config.concurrency)
  
  - While queue.shouldContinue() AND not isCancelled:
    - Dequeue next job
    - If null, wait 100ms and continue
    
    - Use limiter to crawl:
      - Emit 'page-start' with URL
      - Try:
        - Fetch page
        - Add to pages array
        - Extract links
        - For each link within maxDepth:
          - Enqueue with depth+1, priority based on context
        - Mark job complete
        - Emit 'page-complete' with page data
      - Catch:
        - Mark job failed with error
        - Emit 'page-failed' with URL and error
    
    - Yield current progress

  - Set isRunning = false
  - Emit 'crawl-complete'

stop(): void
  - Set isCancelled = true
  - Emit 'crawl-cancelled'

getProgress(): CrawlProgress
  - Calculate from queue state and timing

getPages(): CrawledPage[]
  - Return pages array

Private getBaseDomain(url: string): string
  - Extract hostname from URL

Export SiteCrawler class.
```

---

## Phase 3: Analysis Engine

### 3.1 Meta Analyzer

```
Create src/lib/analyzer/meta.ts:

Analyze meta tags and return CheckItem array:

function analyzeMeta(html: string, url: string): CheckItem[]

Use Cheerio to parse HTML.

Checks (each returns a CheckItem):

1. Title Tag
   - Find <title>
   - Pass: exists AND 50-60 chars
   - Warning: exists but <50 or >60 chars
   - Fail: missing
   - Recommendation based on issue

2. Meta Description
   - Find meta[name="description"]
   - Pass: exists AND 120-160 chars
   - Warning: exists but <120 or >160 chars
   - Fail: missing
   - Include actual length in 'found'

3. Canonical URL
   - Find link[rel="canonical"]
   - Pass: exists and matches current URL (normalized)
   - Warning: exists but different URL
   - Fail: missing

4. Viewport
   - Find meta[name="viewport"]
   - Pass: exists with width=device-width
   - Fail: missing

5. Robots
   - Find meta[name="robots"]
   - Pass: missing OR contains "index"
   - Warning: contains "noindex" or "nofollow"

6. Open Graph (og:title)
   - Pass: exists
   - Warning: missing

7. Open Graph (og:description)
   - Pass: exists
   - Warning: missing

8. Open Graph (og:image)
   - Pass: exists with valid URL
   - Warning: missing

9. Twitter Card
   - Find meta[name="twitter:card"]
   - Pass: exists
   - Warning: missing

Return all CheckItems with appropriate weights:
- Title: 15
- Description: 15
- Canonical: 10
- Viewport: 10
- OG tags: 5 each
- Twitter: 5

Export analyzeMeta function.
```

### 3.2 Content Analyzer

```
Create src/lib/analyzer/content.ts:

Analyze content structure and return CheckItem array:

function analyzeContent(html: string): CheckItem[]

Use Cheerio to parse.

Checks:

1. H1 Count
   - Count h1 elements
   - Pass: exactly 1
   - Warning: 0 or >1
   - Include count in 'found'

2. Heading Hierarchy
   - Get all h1, h2, h3, h4, h5, h6
   - Check for proper nesting (no skipped levels)
   - Pass: proper hierarchy
   - Warning: skipped levels (e.g., h1 -> h3)
   - Include structure summary in 'found'

3. Word Count
   - Extract text content (exclude scripts, styles)
   - Count words
   - Pass: >= 300 words
   - Warning: 100-299 words
   - Fail: < 100 words

4. Image Alt Text
   - Find all img elements
   - Count total vs those with non-empty alt
   - Pass: all images have alt
   - Warning: >50% have alt
   - Fail: <=50% have alt
   - Include "X of Y images have alt" in 'found'

5. Internal Links
   - Count links to same domain
   - Pass: >= 3 internal links
   - Warning: 1-2 internal links
   - Fail: 0 internal links

6. External Links
   - Count links to other domains
   - Pass: >= 1 external link (shows authority)
   - Info: 0 external links (not necessarily bad)

Weights:
- H1: 15
- Hierarchy: 10
- Word count: 15
- Alt text: 15
- Internal links: 10
- External links: 5

Export analyzeContent function.
```

### 3.3 Technical Analyzer

```
Create src/lib/analyzer/technical.ts:

Analyze technical SEO factors:

function analyzeTechnical(
  page: CrawledPage,
  sitemapUrls?: string[],
  robotsDisallowed?: string[]
): CheckItem[]

Checks:

1. HTTPS
   - Check if page.url starts with https://
   - Pass: HTTPS
   - Fail: HTTP

2. Load Time
   - Use page.loadTime
   - Pass: < 2 seconds
   - Warning: 2-4 seconds
   - Fail: > 4 seconds
   - Include actual time in 'found'

3. In Sitemap (if sitemapUrls provided)
   - Check if page URL is in sitemap
   - Pass: in sitemap
   - Warning: not in sitemap
   - Skip if no sitemap data

4. Not Blocked by Robots (if robotsDisallowed provided)
   - Check if URL matches any disallowed pattern
   - Pass: not blocked
   - Warning: blocked by robots.txt

5. Status Code
   - Check page.statusCode
   - Pass: 200
   - Warning: 301, 302 (redirects)
   - Fail: 4xx, 5xx

6. Structured Data
   - Find all script[type="application/ld+json"]
   - Parse and identify @type values
   - Pass: has structured data
   - Warning: no structured data
   - Include types found in 'found'

Weights:
- HTTPS: 20
- Load time: 15
- Sitemap: 10
- Robots: 10
- Status: 15
- Structured data: 15

Export analyzeTechnical function.
```

### 3.4 AEO Analyzer

```
Create src/lib/analyzer/aeo.ts:

Analyze Answer Engine Optimization factors:

function analyzeAeo(html: string): CheckItem[]

Use Cheerio to parse.

Checks:

1. FAQ Schema
   - Find JSON-LD with @type: "FAQPage"
   - Pass: found
   - Fail: not found
   - Include question count if found

2. HowTo Schema
   - Find JSON-LD with @type: "HowTo"
   - Pass: found
   - Fail: not found

3. Speakable Schema
   - Find JSON-LD with speakable property
   - Pass: found
   - Warning: not found

4. Question Headings
   - Find h2, h3 starting with: What, Why, How, When, Where, Who, Which, Can, Does, Is, Are
   - Pass: >= 3 question headings
   - Warning: 1-2 question headings
   - Fail: 0 question headings
   - Include count in 'found'

5. Direct Answers
   - For each question heading, check if followed by short paragraph (<60 words)
   - This indicates direct answer format
   - Pass: most questions have direct answers
   - Warning: some do
   - Fail: none do

6. Lists for Featured Snippets
   - Count <ul>, <ol> elements with 3+ items
   - Pass: >= 2 lists
   - Warning: 1 list
   - Info: 0 lists

7. Tables for Featured Snippets
   - Count <table> elements
   - Pass: >= 1 table
   - Info: 0 tables

Weights:
- FAQ Schema: 20
- HowTo Schema: 15
- Speakable: 10
- Question headings: 15
- Direct answers: 15
- Lists: 10
- Tables: 10

Export analyzeAeo function.
```

### 3.5 Scoring

```
Create src/lib/scoring.ts:

Calculate scores from CheckItem arrays:

interface ScoreBreakdown {
  overall: number
  seo: number
  aeo: number
  details: {
    meta: number
    content: number
    technical: number
    aeo: number
  }
}

function calculateScores(
  meta: CheckItem[],
  content: CheckItem[],
  technical: CheckItem[],
  aeo: CheckItem[]
): ScoreBreakdown

Scoring logic:

1. For each category, calculate weighted score:
   - Sum of (item.weight * statusMultiplier) / sum of all weights
   - statusMultiplier: pass=1, warning=0.5, fail=0

2. Category scores (0-100):
   - metaScore = weighted score of meta items
   - contentScore = weighted score of content items
   - technicalScore = weighted score of technical items
   - aeoScore = weighted score of aeo items

3. SEO Score (0-100):
   - (metaScore * 0.25) + (contentScore * 0.35) + (technicalScore * 0.40)

4. AEO Score (0-100):
   - Direct calculation from aeo items

5. Overall Score (0-100):
   - (seoScore * 0.60) + (aeoScore * 0.40)

Return ScoreBreakdown with all values rounded to integers.

Export calculateScores function.
```

### 3.6 Page Analyzer

```
Create src/lib/analyzer/index.ts:

Combine all analyzers for page and batch analysis:

Import all analyzer modules and scoring.

async function analyzePage(page: CrawledPage): Promise<PageAnalysis>
  - Run all analyzers:
    meta = analyzeMeta(page.html, page.url)
    content = analyzeContent(page.html)
    technical = analyzeTechnical(page)
    aeo = analyzeAeo(page.html)
  
  - Calculate scores
  
  - Return PageAnalysis object

async function analyzePages(
  pages: CrawledPage[],
  concurrency: number = 5,
  onProgress?: (completed: number, total: number, url: string) => void
): Promise<PageAnalysis[]>
  
  - Use p-limit for concurrency
  - For each page:
    - Analyze
    - Call onProgress if provided
  - Return all PageAnalysis results

Export both functions.
```

### 3.7 Site Aggregator

```
Create src/lib/analyzer/aggregator.ts:

Aggregate page analyses into site-wide analysis:

function aggregateSiteAnalysis(
  pages: PageAnalysis[],
  crawledPages: CrawledPage[],
  config: CrawlConfig
): SiteAnalysis

Steps:

1. Calculate weighted site scores:
   - Homepage (depth 0): weight 3
   - Depth 1 pages: weight 2
   - Deeper pages: weight 1
   - weightedScore = sum(page.score * weight) / sum(weights)

2. Calculate statistics:
   - totalPages: pages.length
   - avgLoadTime: average of crawledPages loadTime
   - totalWordCount: sum from content analysis
   - pagesWithoutH1: count where H1 check failed
   - pagesWithMultipleH1: count where H1 found > 1
   - pagesWithoutDescription: count where description missing
   - pagesWithShortDescription: count where description < 120
   - imagesTotal: sum of all images found
   - imagesWithoutAlt: sum of images missing alt
   - pagesWithStructuredData: count with any JSON-LD
   - pagesWithFaqSchema: count with FAQPage
   - pagesWithHowToSchema: count with HowTo
   - avgInternalLinks: average internal links per page
   - orphanPages: pages with 0 incoming internal links (analyze link graph)

3. Identify site-wide issues:

   Critical (>50% of pages affected):
   - missing_description: "Missing meta descriptions"
   - missing_h1: "Missing H1 tags"
   - multiple_h1: "Multiple H1 tags"
   - no_structured_data: "No structured data"
   - slow_pages: "Slow load times (>4s)"

   Warnings (20-50% affected):
   - short_description: "Short meta descriptions"
   - thin_content: "Thin content (<300 words)"
   - images_no_alt: "Images missing alt text"
   - no_internal_links: "Pages with no internal links"

   Opportunities:
   - faq_opportunity: pages with question headings but no FAQ schema
   - howto_opportunity: pages with numbered lists but no HowTo schema
   - speakable_opportunity: pages with short paragraphs but no speakable

   For each issue, include:
   - type, severity, title, description
   - affectedPages: array of URLs
   - count: number of affected pages
   - recommendation: what to do

4. Build and return SiteAnalysis object

Export aggregateSiteAnalysis function.
```

---

## Phase 4: Orchestrator

### 4.1 State Machine

```
Create src/lib/orchestrator/index.ts:

State machine orchestrating the full analysis:

Import: SiteCrawler, analyzePages, aggregateSiteAnalysis, all types
Import: EventEmitter from 'eventemitter3'

Valid transitions:
- idle -> initializing
- initializing -> crawling | error
- crawling -> analyzing | error | cancelled
- analyzing -> aggregating | error | cancelled
- aggregating -> ai-processing | error
- ai-processing -> complete | complete (with partial on AI error)
- any -> cancelled

Class AnalysisOrchestrator extends EventEmitter:

Private:
  config: CrawlConfig
  state: OrchestratorState = 'idle'
  context: OrchestratorContext
  crawler: SiteCrawler | null = null

Constructor(config: CrawlConfig)
  - Store config
  - Initialize empty context

Private transition(to: OrchestratorState): void
  - Validate transition is allowed
  - Update state
  - Emit 'state-change' event with { from, to, timestamp }

async start(): Promise<SiteAnalysis>
  - transition('initializing')
  - Initialize context with config, timestamps
  
  - transition('crawling')
  - Create SiteCrawler
  - Subscribe to crawler events, re-emit as orchestrator events
  - For await (progress of crawler.start()):
    - Update context.progress
    - Emit 'crawl-progress' event
  - Store crawled pages in context
  
  - transition('analyzing')
  - Call analyzePages with progress callback
  - For each page analyzed:
    - Update context.pageAnalyses
    - Emit 'page-analyzed' event with { url, scores }
  
  - transition('aggregating')
  - Call aggregateSiteAnalysis
  - Store in context.siteAnalysis
  
  - transition('ai-processing')
  - Try:
    - Call generateRecommendations (from openai.ts)
    - Add to siteAnalysis.aiRecommendations
  - Catch:
    - Log error, continue without AI
    - Add error to context.errors
  
  - transition('complete')
  - Set completedAt
  - Emit 'complete' event with siteAnalysis
  - Return siteAnalysis

cancel(): void
  - If crawler running, stop it
  - transition('cancelled')
  - Emit 'cancelled' event with partial results

getContext(): OrchestratorContext
  - Return current context

getState(): OrchestratorState
  - Return current state

Private handleError(phase: OrchestratorState, error: Error, url?: string): void
  - Create OrchestratorError
  - Add to context.errors
  - Emit 'error' event
  - If critical, transition to 'error'
  - Otherwise, log and continue

Export AnalysisOrchestrator class.
```

### 4.2 SSE Stream Endpoint

```
Create src/app/api/analyze/stream/route.ts:

Server-Sent Events endpoint for real-time analysis:

Import: AnalysisOrchestrator, types
Import: NextRequest

export async function GET(request: NextRequest)
  - Parse search params: url, maxPages, maxDepth
  
  - Validate:
    - url is valid URL
    - maxPages is 1-100
    - maxDepth is 1-3
  
  - If invalid, return 400 JSON error
  
  - Create config object with defaults:
    respectRobotsTxt: true
    includeSitemap: true
    concurrency: 3
    timeout: 15000
  
  - Create ReadableStream:
    
    async start(controller):
      const encoder = new TextEncoder()
      
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      
      const orchestrator = new AnalysisOrchestrator(config)
      
      // Subscribe to events
      orchestrator.on('state-change', (data) => send('state', data))
      orchestrator.on('crawl-progress', (data) => send('progress', data))
      orchestrator.on('page-analyzed', (data) => send('page', data))
      orchestrator.on('error', (data) => send('error', data))
      
      try {
        const result = await orchestrator.start()
        send('complete', result)
      } catch (error) {
        send('error', { 
          message: error.message, 
          fatal: true,
          partialResults: orchestrator.getContext().siteAnalysis
        })
      } finally {
        controller.close()
      }
  
  - Return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

export const maxDuration = 300  // 5 minutes
```

---

## Phase 5: OpenAI Integration

### 5.1 GPT-4.1 Site Analysis

```
Create src/lib/openai.ts:

OpenAI integration for site-wide recommendations:

Import: OpenAI from 'openai'
Import: SiteAnalysis, AIRecommendations types

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateRecommendations(
  analysis: SiteAnalysis
): Promise<AIRecommendations>

Build system prompt:
"""
You are an expert SEO and AEO consultant analyzing a multi-page website audit.

You have comprehensive data from ${analysis.stats.totalPages} pages of ${analysis.domain}.

Your task:
1. Identify SITE-WIDE patterns (issues on multiple pages = template fixes)
2. Prioritize by: (impact × affected pages) ÷ effort
3. Suggest quick wins (low effort, high impact)
4. Provide specific, actionable recommendations
5. Include code snippets for implementation

Categories:
- siteWide: Template-level fixes affecting many pages
- critical: Severe issues hurting rankings now
- important: Significant improvements needed
- enhancements: Nice-to-have optimizations
- quickWins: Easy fixes with big impact

Each recommendation needs:
{
  "title": "Clear action title",
  "description": "Why this matters for SEO/AEO",
  "action": "Specific steps to implement",
  "impact": "high|medium|low",
  "effort": "low|medium|high",
  "affectedPages": ["url1", "url2"],  // for site-wide issues
  "codeSnippet": "// optional code example"
}

Respond with valid JSON only, no markdown.
"""

Build user prompt with:
- Domain and page count
- Overall, SEO, AEO scores
- Site-wide statistics (from analysis.stats)
- Site-wide issues by severity
- Top 5 worst-scoring pages with their scores
- Structured data coverage percentage
- List specific issue counts

API call:
- model: 'gpt-4.1'
- response_format: { type: 'json_object' }
- temperature: 0.3
- max_tokens: 4096
- messages: [system, user]

Parse response and return AIRecommendations.

Add retry logic:
- Retry up to 2 times on rate limit
- Exponential backoff

Export generateRecommendations function.
```

---

## Phase 6: Frontend

### 6.1 Crawl Settings

```
Create src/components/crawl-settings.tsx:

'use client'

Configuration panel for crawl parameters:

Props:
  config: CrawlConfig
  onChange: (config: CrawlConfig) => void
  disabled?: boolean

UI:

1. Max Pages
   - Slider with stops: 10, 25, 50, 100
   - Show selected value
   - Estimated time hint based on value

2. Max Depth
   - Slider: 1, 2, 3
   - Visual explanation:
     Depth 1: "Homepage + direct links"
     Depth 2: "2 levels deep"
     Depth 3: "3 levels deep (comprehensive)"

3. Toggles:
   - "Include sitemap URLs" (default on)
   - "Respect robots.txt" (default on)

4. Presets row:
   - "Quick" button: 10 pages, depth 1
   - "Standard" button: 25 pages, depth 2
   - "Deep" button: 50 pages, depth 3

5. Advanced (collapsible):
   - Concurrency: 1-5 slider
   - Timeout: 10-30 seconds slider

Styling:
- Dark theme card
- Subtle borders
- Disabled state when crawling

Use shadcn/ui Slider, Switch, Button, Collapsible

Export CrawlSettings component.
```

### 6.2 Crawl Progress

```
Create src/components/crawl-progress.tsx:

'use client'

Real-time crawl progress visualization:

Props:
  state: OrchestratorState
  progress: CrawlProgress | null
  errors: OrchestratorError[]

UI:

1. State indicator (top):
   - Icon + text for each state
   - initializing: Loader icon, "Preparing..."
   - crawling: Spider icon, "Crawling website..."
   - analyzing: Search icon, "Analyzing pages..."
   - aggregating: BarChart icon, "Calculating metrics..."
   - ai-processing: Sparkles icon, "AI generating recommendations..."
   - complete: CheckCircle icon, "Analysis complete!"
   - error: XCircle icon, error message

2. Progress bar:
   - shadcn Progress component
   - Label: "X of Y pages (Z%)"
   - Animated fill

3. Current URL (if crawling):
   - Truncated with ellipsis
   - Monospace font

4. Stats row:
   - Pages/second
   - Estimated time remaining
   - Failed count (if > 0, with warning color)

5. Activity log (last 5 events):
   - Small scrollable list
   - Green check for success
   - Red X for failures
   - Format: "✓ /about (0.8s)"

6. Errors panel (if errors.length > 0):
   - Collapsible
   - List failed URLs with error messages

Use framer-motion for transitions between states.

Export CrawlProgress component.
```

### 6.3 Score Card

```
Create src/components/score-card.tsx:

'use client'

Circular progress score display:

Props:
  label: string
  score: number
  type: 'overall' | 'seo' | 'aeo'

UI:

1. SVG circular progress:
   - 120px diameter
   - 8px stroke width
   - Background ring (dark)
   - Progress ring (colored by type)
   - Animate stroke-dashoffset on mount

2. Score value centered:
   - Large bold number
   - Animate count-up from 0

3. Label above ring:
   - Uppercase, small, muted

4. Status badge below:
   - 90-100: "Excellent" (emerald)
   - 70-89: "Good" (cyan)
   - 50-69: "Needs Work" (amber)
   - 0-49: "Poor" (rose)

Colors by type:
- overall: cyan (#00d4ff)
- seo: emerald (#10b981)
- aeo: violet (#8b5cf6)

Use framer-motion for animations:
- Ring fill animation (1s ease-out)
- Number count-up (1s)
- Stagger when multiple cards

Export ScoreCard component.
```

### 6.4 Site Overview

```
Create src/components/site-overview.tsx:

'use client'

Dashboard showing site-wide metrics:

Props:
  analysis: SiteAnalysis

UI:

1. Score cards row (3 cards):
   - Overall, SEO, AEO using ScoreCard component

2. Statistics grid (2 rows × 4 cols):
   Row 1:
   - Pages crawled (number)
   - Avg load time (with color coding)
   - Avg word count (number)
   - Schema coverage (percentage)
   
   Row 2:
   - Pages without H1 (number, red if > 0)
   - Missing descriptions (number)
   - Images without alt (X/Y format)
   - Orphan pages (number)

3. Issues summary cards (3 cards):
   - Critical: count + red badge
   - Warnings: count + amber badge
   - Opportunities: count + green badge
   - Click to expand/show details

4. Quick wins preview:
   - Show top 3 from aiRecommendations.quickWins
   - Each as small card with title + impact badge
   - "View all" link

Styling:
- Grid layout, responsive
- Dark cards with subtle borders
- Color-coded values (green/amber/red for good/warning/bad)

Export SiteOverview component.
```

### 6.5 Page List

```
Create src/components/page-list.tsx:

'use client'

Sortable, filterable list of all analyzed pages:

Props:
  pages: PageAnalysis[]
  onSelect: (url: string) => void
  selectedUrl?: string

State:
  sortField: 'url' | 'depth' | 'overall' | 'seo' | 'aeo' | 'issues'
  sortDirection: 'asc' | 'desc'
  searchQuery: string
  filters: { hasIssues?: boolean, missingH1?: boolean, noSchema?: boolean }

UI:

1. Toolbar:
   - Search input (filter by URL)
   - Filter dropdown: "All", "Has Issues", "Missing H1", "No Schema"
   - Export CSV button

2. Table:
   Columns (click to sort):
   - URL (truncated, full on hover)
   - Depth
   - Overall score (colored badge)
   - SEO score
   - AEO score
   - Issues (count of failed checks)

3. Rows:
   - Click to select (highlights row)
   - Selected row has border accent
   - Hover state

4. Pagination or virtual scroll for large lists

5. Empty state if no pages match filters

Sorting:
- Default: overall ascending (worst first)
- Remember sort preference

Export CSV:
- URL, Depth, Overall, SEO, AEO, Issues count
- Download as CSV file

Export PageList component.
```

### 6.6 AI Recommendations

```
Create src/components/ai-recommendations.tsx:

'use client'

Display AI-generated recommendations:

Props:
  recommendations: AIRecommendations | null
  isLoading: boolean

UI:

1. Loading state:
   - Sparkles icon with pulse animation
   - "GPT-4.1 is analyzing your site..."
   - Skeleton cards

2. Tabs for categories:
   - Site-Wide (template fixes)
   - Critical
   - Important
   - Enhancements
   - Quick Wins
   - Show count badge on each tab

3. Recommendation cards:
   For each recommendation:
   
   - Header row:
     - Title (bold)
     - Impact badge (HIGH=red, MEDIUM=amber, LOW=green)
     - Effort badge (LOW=green, MEDIUM=amber, HIGH=red)
   
   - Description paragraph
   
   - Action box:
     - Gray background
     - Arrow icon + action text
   
   - Affected pages (if present):
     - Collapsible list
     - "Affects X pages" trigger
     - List of URLs when expanded
   
   - Code snippet (if present):
     - Collapsible
     - Syntax highlighted
     - Copy button

4. Empty state per category:
   - "No [category] issues found"
   - With appropriate icon

Animation:
- Stagger cards on tab change
- Smooth expand/collapse

Export AIRecommendations component.
```

### 6.7 Main Page

```
Create src/app/page.tsx:

'use client'

Main analyzer dashboard:

State:
  url: string
  config: CrawlConfig (with defaults)
  state: OrchestratorState
  progress: CrawlProgress | null
  analysis: SiteAnalysis | null
  selectedPageUrl: string | null
  errors: OrchestratorError[]

Flow:

1. Initial view:
   - Hero section with title "SEO & AEO Analyzer Pro"
   - URL input (large, centered)
   - CrawlSettings component
   - "Start Analysis" button

2. Handle submit:
   - Validate URL
   - Set state to 'initializing'
   - Connect to SSE endpoint

3. SSE connection:
   useEffect when state changes to 'initializing':
   
   const es = new EventSource(
     `/api/analyze/stream?url=${encodeURIComponent(url)}&maxPages=${config.maxPages}&maxDepth=${config.maxDepth}`
   )
   
   es.addEventListener('state', (e) => {
     const data = JSON.parse(e.data)
     setState(data.to)
   })
   
   es.addEventListener('progress', (e) => {
     setProgress(JSON.parse(e.data))
   })
   
   es.addEventListener('page', (e) => {
     // Update page count or show in log
   })
   
   es.addEventListener('error', (e) => {
     const data = JSON.parse(e.data)
     setErrors(prev => [...prev, data])
     if (data.fatal) {
       setState('error')
       if (data.partialResults) setAnalysis(data.partialResults)
     }
   })
   
   es.addEventListener('complete', (e) => {
     setAnalysis(JSON.parse(e.data))
     setState('complete')
     es.close()
   })
   
   return () => es.close()

4. During analysis (state !== 'idle' && state !== 'complete'):
   - Show CrawlProgress component
   - Cancel button

5. After complete:
   - SiteOverview component
   - Tabs: "Pages" | "Site Issues" | "AI Recommendations"
   - Pages tab: PageList + selected page details
   - Issues tab: grouped site-wide issues
   - AI tab: AIRecommendations component

6. Selected page view:
   - Side panel or modal
   - Show PageAnalysis details
   - Tabs for Meta, Content, Technical, AEO
   - CheckItem list for each

Layout:
- Dark theme: bg-[#0a0a0f]
- Container max-width with padding
- Responsive grid

Export default page component.
```

---

## Phase 7: Database & Deployment

### 7.1 Supabase Schema

```
Create Supabase tables and RLS policies:

-- Site analyses table
CREATE TABLE site_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  domain TEXT NOT NULL,
  start_url TEXT NOT NULL,
  
  max_pages INTEGER NOT NULL,
  max_depth INTEGER NOT NULL,
  
  overall_score INTEGER NOT NULL,
  seo_score INTEGER NOT NULL,
  aeo_score INTEGER NOT NULL,
  
  pages_crawled INTEGER NOT NULL,
  pages_failed INTEGER DEFAULT 0,
  
  stats JSONB NOT NULL,
  site_wide_issues JSONB NOT NULL,
  ai_recommendations JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Page analyses table (for detailed queries)
CREATE TABLE page_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_analysis_id UUID REFERENCES site_analyses(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  depth INTEGER NOT NULL,
  
  overall_score INTEGER NOT NULL,
  seo_score INTEGER NOT NULL,
  aeo_score INTEGER NOT NULL,
  
  issues_count INTEGER NOT NULL,
  
  meta JSONB NOT NULL,
  content JSONB NOT NULL,
  technical JSONB NOT NULL,
  aeo JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_site_analyses_user ON site_analyses(user_id);
CREATE INDEX idx_site_analyses_domain ON site_analyses(domain);
CREATE INDEX idx_site_analyses_created ON site_analyses(created_at DESC);
CREATE INDEX idx_page_analyses_site ON page_analyses(site_analysis_id);

-- RLS
ALTER TABLE site_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON site_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON site_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON site_analyses FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view pages of own analyses"
  ON page_analyses FOR SELECT
  USING (
    site_analysis_id IN (
      SELECT id FROM site_analyses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages to own analyses"
  ON page_analyses FOR INSERT
  WITH CHECK (
    site_analysis_id IN (
      SELECT id FROM site_analyses WHERE user_id = auth.uid()
    )
  );
```

### 7.2 Supabase Client

```
Create src/lib/supabase.ts:

Supabase client and database functions:

Import: createClient from '@supabase/supabase-js'
Import: SiteAnalysis, PageAnalysis types

// Browser client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server client (for API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function saveAnalysis(
  userId: string,
  analysis: SiteAnalysis
): Promise<string> {
  const supabase = createServerClient()
  
  // Insert site analysis
  const { data: siteData, error: siteError } = await supabase
    .from('site_analyses')
    .insert({
      user_id: userId,
      domain: analysis.domain,
      start_url: analysis.startUrl,
      max_pages: analysis.crawlConfig.maxPages,
      max_depth: analysis.crawlConfig.maxDepth,
      overall_score: analysis.scores.overall,
      seo_score: analysis.scores.seo,
      aeo_score: analysis.scores.aeo,
      pages_crawled: analysis.stats.totalPages,
      stats: analysis.stats,
      site_wide_issues: analysis.siteWideIssues,
      ai_recommendations: analysis.aiRecommendations,
      completed_at: analysis.completedAt
    })
    .select('id')
    .single()
  
  if (siteError) throw siteError
  
  // Insert page analyses
  const pageInserts = analysis.pages.map(page => ({
    site_analysis_id: siteData.id,
    url: page.url,
    depth: page.depth,
    overall_score: page.scores.overall,
    seo_score: page.scores.seo,
    aeo_score: page.scores.aeo,
    issues_count: [...page.meta, ...page.content, ...page.technical, ...page.aeo]
      .filter(item => item.status === 'fail').length,
    meta: page.meta,
    content: page.content,
    technical: page.technical,
    aeo: page.aeo
  }))
  
  const { error: pageError } = await supabase
    .from('page_analyses')
    .insert(pageInserts)
  
  if (pageError) throw pageError
  
  return siteData.id
}

export async function getAnalysisHistory(
  userId: string,
  limit = 10
): Promise<SiteAnalysis[]> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('site_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  
  return data.map(row => ({
    id: row.id,
    domain: row.domain,
    startUrl: row.start_url,
    crawlConfig: {
      startUrl: row.start_url,
      maxPages: row.max_pages,
      maxDepth: row.max_depth
    },
    scores: {
      overall: row.overall_score,
      seo: row.seo_score,
      aeo: row.aeo_score
    },
    stats: row.stats,
    siteWideIssues: row.site_wide_issues,
    aiRecommendations: row.ai_recommendations,
    crawledAt: new Date(row.created_at),
    completedAt: new Date(row.completed_at),
    pages: [] // Fetch separately if needed
  }))
}

export async function getAnalysisById(id: string): Promise<SiteAnalysis | null> {
  const supabase = createServerClient()
  
  // Fetch site analysis
  const { data: site, error: siteError } = await supabase
    .from('site_analyses')
    .select('*')
    .eq('id', id)
    .single()
  
  if (siteError || !site) return null
  
  // Fetch pages
  const { data: pages, error: pagesError } = await supabase
    .from('page_analyses')
    .select('*')
    .eq('site_analysis_id', id)
  
  if (pagesError) throw pagesError
  
  return {
    id: site.id,
    domain: site.domain,
    startUrl: site.start_url,
    crawlConfig: { ... },
    scores: { ... },
    stats: site.stats,
    siteWideIssues: site.site_wide_issues,
    aiRecommendations: site.ai_recommendations,
    pages: pages.map(p => ({ ... })),
    crawledAt: new Date(site.created_at),
    completedAt: new Date(site.completed_at)
  }
}

Export all functions.
```

### 7.3 Error Handling

```
Add comprehensive error handling throughout the app:

1. Create src/lib/errors.ts:
   - Custom error classes: CrawlError, AnalysisError, AIError
   - Error factory functions
   - Error logging utility

2. Update crawler/fetcher.ts:
   - CircuitOpenError for circuit breaker
   - TimeoutError for fetch timeouts
   - RateLimitError for 429s
   - Proper error messages with context

3. Update orchestrator:
   - Wrap each phase in try/catch
   - Log errors with context
   - Continue with partial results when possible
   - Always emit error events

4. Create src/components/error-boundary.tsx:
   - React error boundary
   - Friendly error UI
   - Retry button
   - Report issue link

5. Add toast notifications:
   - Install sonner or react-hot-toast
   - Show toasts for:
     - Analysis started
     - Pages failing (batched, not every one)
     - Analysis complete
     - Errors (with retry action)

6. Update main page:
   - Show partial results on error
   - Retry button for failed operations
   - Clear error states

7. Add SSE reconnection:
   - Detect disconnection
   - Auto-reconnect with backoff
   - Resume from last state if possible
```

### 7.4 Deployment

```
Prepare for Vercel deployment:

1. Create vercel.json:
{
  "functions": {
    "app/api/analyze/stream/route.ts": {
      "maxDuration": 300
    },
    "app/api/ai-recommendations/route.ts": {
      "maxDuration": 60
    }
  }
}

2. Update next.config.js if needed for any external packages

3. Add environment variables in Vercel dashboard:
   - OPENAI_API_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY

4. Add SEO meta tags to layout.tsx:
   - Title: "SEO & AEO Analyzer Pro | Multi-Page Website Analysis"
   - Description: compelling, 150-160 chars
   - Open Graph tags
   - Twitter card tags
   
5. Create public/robots.txt:
   User-agent: *
   Allow: /
   Sitemap: https://yourdomain.com/sitemap.xml

6. Create public/sitemap.xml or generate dynamically

7. Add favicon and og-image

8. Optional: Add Sentry for error monitoring
   - npm install @sentry/nextjs
   - Configure in sentry.client.config.ts and sentry.server.config.ts

9. Deploy:
   - Connect GitHub repo to Vercel
   - Vercel auto-deploys on push
```

---

## Checklist

Phase 1:
- [ ] Project initialized with dependencies
- [ ] Types: crawler.ts
- [ ] Types: analysis.ts
- [ ] Types: orchestrator.ts

Phase 2:
- [ ] Priority queue with deduplication
- [ ] Fetcher with circuit breaker
- [ ] Link extractor
- [ ] Main crawler

Phase 3:
- [ ] Meta analyzer
- [ ] Content analyzer
- [ ] Technical analyzer
- [ ] AEO analyzer
- [ ] Scoring function
- [ ] Page analyzer
- [ ] Site aggregator

Phase 4:
- [ ] Orchestrator state machine
- [ ] SSE stream endpoint

Phase 5:
- [ ] OpenAI integration

Phase 6:
- [ ] Crawl settings component
- [ ] Crawl progress component
- [ ] Score card component
- [ ] Site overview component
- [ ] Page list component
- [ ] AI recommendations component
- [ ] Main page

Phase 7:
- [ ] Supabase schema
- [ ] Supabase client functions
- [ ] Error handling
- [ ] Deployed to Vercel

---

## Testing Tips

1. Start with 5 pages, depth 1 during development
2. Test circuit breaker by throttling network
3. Test SSE in browser DevTools Network tab
4. Mock OpenAI responses to save costs during dev
5. Use a simple static site for initial testing
