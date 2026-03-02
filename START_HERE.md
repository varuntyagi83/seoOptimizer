# Getting Started - Build with Compound Engineering

> Copy-paste these prompts into Claude Code in order.

---

## Step 1: Start Claude Code

Open Claude Code in your terminal and navigate to where you want the project:

```bash
cd ~/projects
claude
```

---

## Step 2: Initialize with Full Context

Copy and paste this entire prompt into Claude Code:

```
I want to build an SEO & AEO Analyzer app with multi-page crawling using Compound Engineering patterns.

## Project Overview

A production-grade website analyzer that:
- Crawls multiple pages (configurable: 10-100 pages, depth 1-3)
- Analyzes SEO factors (meta tags, content, technical)
- Analyzes AEO factors (schema markup, question headings, featured snippet readiness)
- Aggregates site-wide issues across all pages
- Uses OpenAI GPT-4.1 for intelligent recommendations
- Shows real-time progress via Server-Sent Events

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- OpenAI GPT-4.1
- Cheerio for HTML parsing

## Architecture

The app uses Compound Engineering patterns:

1. **Circuit Breaker** - Crawler stops hammering failing sites
2. **Retry Logic** - Exponential backoff for transient failures  
3. **State Machine** - Orchestrator manages: idle → crawling → analyzing → ai → complete
4. **Event-Driven** - Real-time updates via SSE
5. **Graceful Degradation** - Always return partial results on error

## Dependency Graph

```
types/ (foundation)
├── crawler.ts
├── analysis.ts
└── orchestrator.ts

lib/crawler/ (depends on types)
├── queue.ts (priority queue)
├── fetcher.ts (HTTP + circuit breaker)
├── link-extractor.ts
└── index.ts (main crawler)

lib/analyzer/ (depends on types)
├── meta.ts
├── content.ts
├── technical.ts
├── aeo.ts
├── index.ts
└── aggregator.ts (site-wide)

lib/orchestrator/ (depends on crawler + analyzer)
└── index.ts (state machine)

lib/openai.ts (AI recommendations)

app/api/analyze/stream/route.ts (SSE endpoint)

components/ (React UI)
├── crawl-settings.tsx
├── crawl-progress.tsx
├── score-card.tsx
├── site-overview.tsx
├── page-list.tsx
└── ai-recommendations.tsx

app/page.tsx (main dashboard)
```

## Build Order

We'll build in phases, validating after each:

1. **Setup** - Initialize Next.js project with dependencies
2. **Types** - TypeScript interfaces (foundation)
3. **Crawler** - Queue, fetcher with circuit breaker, link extractor
4. **Analyzers** - Meta, content, technical, AEO analysis
5. **Orchestrator** - State machine coordinating everything
6. **API** - SSE endpoint + OpenAI integration
7. **Frontend** - React components
8. **Database** - Supabase schema

---

Let's start with Phase 1: Project Setup.

Create a new Next.js 14 project called "seo-aeo-analyzer" with:
- TypeScript
- Tailwind CSS
- App Router
- src/ directory

Then install these dependencies:
- openai
- cheerio
- @supabase/supabase-js
- lucide-react
- framer-motion
- zod
- p-limit
- p-retry
- eventemitter3

Set up shadcn/ui with components: button, input, card, tabs, badge, skeleton, progress, alert, slider

Create .env.local with placeholders for:
- OPENAI_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY

Create the folder structure shown in the dependency graph above.
```

---

## Step 3: Build Types (Foundation)

After setup is complete, paste:

```
Now let's build Phase 2: TypeScript Types.

These are the foundation - everything else depends on them.

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
  finalUrl: string
  statusCode: number
  contentType: string
  html: string
  loadTime: number
  depth: number
  internalLinks: string[]
  externalLinks: string[]
  fetchedAt: Date
}

---

Create src/types/analysis.ts:

interface PageAnalysis {
  url: string
  depth: number
  scores: { overall: number; seo: number; aeo: number }
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
  scores: { overall: number; seo: number; aeo: number }
  pages: PageAnalysis[]
  siteWideIssues: {
    critical: SiteIssue[]
    warnings: SiteIssue[]
    opportunities: SiteIssue[]
  }
  stats: {
    totalPages: number
    avgLoadTime: number
    pagesWithoutH1: number
    pagesWithoutDescription: number
    imagesWithoutAlt: number
    pagesWithStructuredData: number
    pagesWithFaqSchema: number
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

---

Create src/types/orchestrator.ts:

type OrchestratorState = 
  | 'idle' | 'initializing' | 'crawling' | 'analyzing'
  | 'aggregating' | 'ai-processing' | 'complete' | 'error' | 'cancelled'

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
  retryable: boolean
  timestamp: Date
}

Export all types from each file.
Validate there are no TypeScript errors.
```

---

## Step 4: Build Crawler

After types are done, paste:

```
Now let's build Phase 3: Crawler with Circuit Breaker.

Dependencies: types/ (completed)

Create these files in order:

1. src/lib/crawler/queue.ts
   - Priority queue for crawl jobs
   - URL normalization (remove trailing slashes, fragments, tracking params)
   - Deduplication (don't crawl same URL twice)
   - Methods: enqueue, dequeue, has, markComplete, markFailed
   - Respects maxPages limit

2. src/lib/crawler/fetcher.ts
   - HTTP fetcher with circuit breaker pattern
   - Circuit states: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)
   - Opens after 5 consecutive failures
   - Half-open after 30 seconds
   - Retry logic with p-retry: max 3 retries, exponential backoff
   - Only retry on: timeout, 5xx, network errors
   - Returns CrawledPage object

3. src/lib/crawler/link-extractor.ts
   - Extract internal links from HTML using Cheerio
   - Normalize URLs (resolve relative, remove fragments)
   - Filter: same domain only, skip files (.pdf, .jpg, etc)
   - Return array with url, anchor text, context (nav/content/footer)

4. src/lib/crawler/index.ts
   - Main SiteCrawler class extending EventEmitter
   - Constructor takes CrawlConfig
   - start() is an async generator yielding CrawlProgress
   - Uses p-limit for concurrency control
   - Optionally fetches sitemap.xml and robots.txt first
   - Emits events: page-start, page-complete, page-failed, crawl-complete

Test that the crawler can fetch a simple website (use https://example.com).
```

---

## Step 5: Build Analyzers

After crawler works, paste:

```
Now let's build Phase 4: Analysis Engine.

Dependencies: types/ (completed)

Create these files:

1. src/lib/analyzer/meta.ts - analyzeMeta(html, url): CheckItem[]
   Check: title (50-60 chars), description (120-160 chars), canonical,
   viewport, robots, og:title, og:description, og:image, twitter:card

2. src/lib/analyzer/content.ts - analyzeContent(html): CheckItem[]
   Check: H1 count (should be 1), heading hierarchy, word count (min 300),
   image alt text coverage, internal links, external links

3. src/lib/analyzer/technical.ts - analyzeTechnical(page): CheckItem[]
   Check: HTTPS, load time (<2s good, >4s bad), status code, structured data

4. src/lib/analyzer/aeo.ts - analyzeAeo(html): CheckItem[]
   Check: FAQ schema, HowTo schema, Speakable schema, question headings,
   lists and tables for featured snippets

5. src/lib/scoring.ts - calculateScores(meta, content, technical, aeo)
   SEO Score = (meta * 0.25) + (content * 0.35) + (technical * 0.40)
   AEO Score = direct from aeo checks
   Overall = (SEO * 0.60) + (AEO * 0.40)

6. src/lib/analyzer/index.ts
   - analyzePage(page: CrawledPage): Promise<PageAnalysis>
   - analyzePages(pages, concurrency, onProgress): Promise<PageAnalysis[]>

7. src/lib/analyzer/aggregator.ts
   - aggregateSiteAnalysis(pages, crawledPages, config): SiteAnalysis
   - Calculate site-wide scores (weighted by page depth)
   - Identify site-wide issues (problems on >20% of pages)
   - Calculate statistics

Validate all analyzers return properly typed CheckItem arrays.
```

---

## Step 6: Build Orchestrator

After analyzers work, paste:

```
Now let's build Phase 5: Orchestrator State Machine.

Dependencies: types/, crawler/, analyzer/ (all completed)

Create src/lib/orchestrator/index.ts:

Class AnalysisOrchestrator extends EventEmitter:

State transitions:
- idle → initializing → crawling → analyzing → aggregating → ai-processing → complete
- Any state can transition to 'error' or 'cancelled'

Methods:
- constructor(config: CrawlConfig)
- async start(): Promise<SiteAnalysis>
  1. transition('initializing')
  2. transition('crawling'), run crawler, collect pages
  3. transition('analyzing'), analyze all pages
  4. transition('aggregating'), aggregate into SiteAnalysis
  5. transition('ai-processing'), call OpenAI (we'll add this next)
  6. transition('complete'), return results
  
- cancel(): void - stop crawler, return partial results
- getContext(): OrchestratorContext
- getState(): OrchestratorState

Events emitted:
- 'state-change': { from, to, timestamp }
- 'crawl-progress': CrawlProgress
- 'page-analyzed': { url, scores }
- 'error': OrchestratorError
- 'complete': SiteAnalysis

Error handling:
- Wrap each phase in try/catch
- On crawler error: continue with pages we have
- On analyzer error: skip that page, continue
- On AI error: return results without AI recommendations
- Always try to return partial results

Test the orchestrator with a small crawl (5 pages, depth 1).
```

---

## Step 7: Build API + OpenAI

After orchestrator works, paste:

```
Now let's build Phase 6: API Routes + OpenAI.

1. Create src/lib/openai.ts:

async function generateRecommendations(analysis: SiteAnalysis): Promise<AIRecommendations>

System prompt: "You are an expert SEO/AEO consultant analyzing a multi-page website.
Identify site-wide patterns, prioritize by impact, suggest quick wins.
Return JSON with: siteWide, critical, important, enhancements, quickWins"

User prompt includes: domain, scores, stats, site-wide issues, worst pages

Config: model 'gpt-4.1', response_format { type: 'json_object' }, temperature 0.3

2. Create src/app/api/analyze/stream/route.ts:

SSE endpoint for real-time updates:

GET /api/analyze/stream?url=...&maxPages=...&maxDepth=...

- Validate params
- Create orchestrator
- Subscribe to events, send via SSE:
  event: state, data: { from, to }
  event: progress, data: CrawlProgress
  event: page, data: { url, scores }
  event: complete, data: SiteAnalysis
  event: error, data: error
- Set maxDuration: 300 (5 minutes for Vercel)

Test the SSE endpoint with curl or browser.
```

---

## Step 8: Build Frontend

After API works, paste:

```
Now let's build Phase 7: Frontend Components.

Build these React components with Tailwind dark theme (bg-[#0a0a0f], cyan accents):

1. src/components/score-card.tsx
   - Circular SVG progress ring (120px)
   - Animated score count-up
   - Status badge: Excellent/Good/Needs Work/Poor

2. src/components/crawl-settings.tsx
   - Max pages slider (10, 25, 50, 100)
   - Max depth slider (1, 2, 3)
   - Preset buttons: Quick, Standard, Deep

3. src/components/crawl-progress.tsx
   - State indicator with icon
   - Progress bar with percentage
   - Current URL
   - Activity log (last 5 events)

4. src/components/site-overview.tsx
   - Three score cards
   - Stats grid
   - Issues summary

5. src/components/page-list.tsx
   - Sortable table of all pages
   - Click to select
   - Filter by issues

6. src/components/ai-recommendations.tsx
   - Tabbed view: Site-Wide, Critical, Important, etc.
   - Recommendation cards with impact/effort badges

7. src/app/page.tsx
   - Main dashboard
   - URL input + crawl settings
   - Connect to SSE endpoint
   - Show progress during crawl
   - Show results when complete

Use EventSource for SSE connection:
const es = new EventSource(`/api/analyze/stream?url=${url}&maxPages=${maxPages}`)
es.addEventListener('progress', (e) => setProgress(JSON.parse(e.data)))
es.addEventListener('complete', (e) => { setAnalysis(JSON.parse(e.data)); es.close() })
```

---

## Step 9: Database + Deploy

Finally, paste:

```
Now let's build Phase 8: Database + Deployment.

1. Create Supabase tables (run in Supabase SQL editor):

CREATE TABLE site_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  domain TEXT NOT NULL,
  start_url TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  seo_score INTEGER NOT NULL,
  aeo_score INTEGER NOT NULL,
  pages_crawled INTEGER NOT NULL,
  stats JSONB NOT NULL,
  site_wide_issues JSONB NOT NULL,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for user isolation

2. Create src/lib/supabase.ts with:
   - Browser client
   - Server client
   - saveAnalysis(userId, analysis)
   - getAnalysisHistory(userId)

3. Create vercel.json:
{
  "functions": {
    "app/api/analyze/stream/route.ts": { "maxDuration": 300 }
  }
}

4. Add SEO meta tags to layout.tsx

5. Deploy to Vercel with environment variables

Done! Test the full flow end-to-end.
```

---

## Summary

That's it! 9 steps total:

1. Initialize with full context
2. Build types (foundation)
3. Build crawler with circuit breaker
4. Build analyzers
5. Build orchestrator state machine
6. Build API + OpenAI
7. Build frontend
8. Database + deploy

Each step builds on the previous. Claude Code maintains context throughout, and the Compound Engineering patterns (circuit breaker, retry logic, state machine) make it resilient.

Good luck! 🚀
