# SEO & AEO Analyzer Pro

> A production-grade, multi-page website analyzer with AI-powered recommendations.

## Overview

This app crawls multiple pages of a website, analyzes SEO and AEO (Answer Engine Optimization) factors, aggregates site-wide issues, and uses OpenAI GPT-4.1 to generate intelligent, prioritized recommendations.

**Why multi-page?** Single-page analysis is nearly useless for real SEO. Template issues, internal linking problems, and site-wide patterns only emerge when you analyze the full site.

---

## Features

- **Multi-page crawling** - Configurable depth (1-3) and page limit (10-100)
- **Priority queue** - Homepage first, then sitemap URLs, then by link depth
- **Real-time progress** - Server-Sent Events for live updates
- **Site-wide aggregation** - Identifies patterns across pages
- **AI recommendations** - GPT-4.1 analyzes the entire site, not just individual pages
- **Resilient architecture** - Circuit breakers, retries, graceful degradation

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI GPT-4.1 |
| Crawling | Cheerio + node-fetch |
| Auth | Supabase Auth |
| Deployment | Vercel |

---

## Architecture

```
+------------------------------------------------------------------+
|                        ORCHESTRATOR                               |
|  (State Machine: idle -> crawling -> analyzing -> ai -> complete) |
+------------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        v                     v                     v
+---------------+    +------------------+    +--------------+
|   CRAWLER     |    |    ANALYZER      |    |  AI ENGINE   |
| (with queue)  |--->| (per-page + agg) |--->|  (GPT-4.1)   |
+---------------+    +------------------+    +--------------+
        |                     |                     |
        v                     v                     v
+---------------+    +------------------+    +--------------+
|Circuit Breaker|    |  Retry Handler   |    |  Fallback    |
| (rate limits) |    | (parse failures) |    |(manual recs) |
+---------------+    +------------------+    +--------------+
```

### Compound Engineering Patterns

1. **Circuit Breaker** (Crawler)
   - Opens after 5 consecutive failures
   - Half-open after 30 seconds
   - Prevents hammering failing/rate-limited sites

2. **Retry Logic** (Fetcher)
   - Max 3 retries with exponential backoff
   - Only retries transient errors (5xx, timeout)
   - Respects Retry-After headers

3. **State Machine** (Orchestrator)
   - Clean state transitions
   - Cancellable at any point
   - Always returns partial results on error

4. **Event-Driven Updates** (SSE)
   - Real-time progress to frontend
   - No polling required

---

## Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts          # Main analysis endpoint
│   │   ├── analyze/stream/route.ts   # SSE for real-time updates
│   │   └── ai-recommendations/route.ts
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── url-input.tsx
│   ├── crawl-settings.tsx            # Depth, max pages config
│   ├── crawl-progress.tsx            # Real-time status
│   ├── score-card.tsx
│   ├── site-overview.tsx             # Aggregated stats
│   ├── page-list.tsx                 # All crawled pages
│   ├── analysis-tabs.tsx
│   ├── check-item.tsx
│   └── ai-recommendations.tsx
├── lib/
│   ├── crawler/
│   │   ├── index.ts                  # Main crawler
│   │   ├── queue.ts                  # Priority queue
│   │   ├── fetcher.ts                # HTTP + circuit breaker
│   │   └── link-extractor.ts
│   ├── analyzer/
│   │   ├── index.ts                  # Page analyzer
│   │   ├── meta.ts
│   │   ├── content.ts
│   │   ├── technical.ts
│   │   ├── aeo.ts
│   │   └── aggregator.ts             # Site-wide aggregation
│   ├── orchestrator/
│   │   ├── index.ts                  # State machine
│   │   ├── states.ts
│   │   └── events.ts
│   ├── openai.ts
│   ├── scoring.ts
│   └── supabase.ts
└── types/
    ├── analysis.ts
    ├── crawler.ts
    └── orchestrator.ts
```

---

## Analysis Categories

### SEO Factors (60% of score)

**Meta Tags (25%)**
- Title tag (presence, 50-60 chars)
- Meta description (presence, 120-160 chars)
- Canonical URL
- Open Graph tags
- Twitter Card tags

**Content (35%)**
- H1 count (should be exactly 1)
- Heading hierarchy (H1 > H2 > H3)
- Word count (minimum 300)
- Image alt text coverage
- Internal/external link counts

**Technical (40%)**
- HTTPS
- Load time
- robots.txt presence
- sitemap.xml presence
- Structured data

### AEO Factors (40% of score)

**Schema Markup (40%)**
- FAQ Schema (FAQPage)
- HowTo Schema
- Speakable Schema

**Content Format (30%)**
- Question-based headings
- Direct answer formatting

**Featured Snippet Ready (30%)**
- Lists and tables
- Concise paragraphs

---

## Site-Wide Analysis

The aggregator identifies patterns across all pages:

**Critical Issues** (affecting >50% of pages)
- Missing meta descriptions
- Missing/multiple H1 tags
- No structured data

**Warnings** (affecting 20-50% of pages)
- Short meta descriptions
- Thin content
- Slow load times

**Opportunities**
- Pages with Q&A content but no FAQ schema
- Pages with instructions but no HowTo schema

---

## AI Recommendations

GPT-4.1 analyzes the complete site data and provides:

| Category | Description |
|----------|-------------|
| Site-Wide | Issues affecting multiple pages (template fixes) |
| Critical | Severe issues hurting rankings now |
| Important | Significant improvements |
| Enhancements | Nice-to-haves |
| Quick Wins | Low effort, high impact |

Each recommendation includes:
- Title and description
- Specific action steps
- Impact and effort ratings
- Affected pages list
- Code snippets where applicable

---

## Environment Variables

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Getting Started

1. Read this README to understand the architecture
2. Open `PHASES.md` for step-by-step Claude Code prompts
3. Run each prompt in order
4. Test after each phase

---

## Deployment

- **Vercel** - Supports long-running SSE (up to 5 min)
- **Supabase** - Database and auth
- Set all environment variables in Vercel dashboard

---

## Implementation Guide

See **PHASES.md** for all Claude Code prompts organized by phase.
