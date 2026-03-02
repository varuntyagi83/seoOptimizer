# Using Compound Engineering Plugin

> This guide explains how to use the Compound Engineering plugin with Claude Code to build the SEO & AEO Analyzer.

---

## What is Compound Engineering?

The Compound Engineering plugin helps Claude Code:
- **Track dependencies** between files
- **Maintain context** across a large codebase
- **Build incrementally** without losing state
- **Validate** that components work together
- **Recover** from errors without starting over

---

## Setup

### 1. Enable the Plugin

In Claude Code, enable Compound Engineering:

```
/plugins enable compound-engineering
```

### 2. Initialize Project Structure

Start by giving Claude Code the full project context:

```
/compound init

I'm building an SEO & AEO Analyzer with multi-page crawling. Here's the architecture:

[Paste the entire README.md content here]

The implementation is in PHASES.md. We'll build it phase by phase.

Create a dependency graph for this project tracking:
- Types (foundation)
- Crawler modules (depends on types)
- Analyzer modules (depends on types, uses crawler output)
- Orchestrator (depends on crawler, analyzer)
- API routes (depends on orchestrator)
- Frontend components (depends on types, calls API)
- Database (depends on types)
```

Claude Code will create an internal dependency graph and track build state.

---

## Building Phase by Phase

### Phase 1: Foundation (Types)

```
/compound phase types

Build the TypeScript types from PHASES.md prompts 1.2, 1.3, 1.4.

These are the foundation - all other modules depend on them.

Files to create:
- src/types/crawler.ts
- src/types/analysis.ts  
- src/types/orchestrator.ts

Validate that all interfaces are exported and there are no circular dependencies.
```

**Checkpoint:** Claude Code will confirm types are complete and valid.

---

### Phase 2: Crawler

```
/compound phase crawler

Build the crawler modules from PHASES.md prompts 2.1-2.4.

Dependencies: types (completed)

Files to create:
- src/lib/crawler/queue.ts (depends on: types/crawler)
- src/lib/crawler/fetcher.ts (depends on: types/crawler)
- src/lib/crawler/link-extractor.ts (depends on: types/crawler)
- src/lib/crawler/index.ts (depends on: queue, fetcher, link-extractor)

Build in order. After each file, validate imports resolve correctly.

Include unit tests for:
- Queue: enqueue, dequeue, deduplication
- Fetcher: circuit breaker state transitions
- Link extractor: URL normalization
```

**Checkpoint:** Run `npm run typecheck` to validate.

---

### Phase 3: Analyzers

```
/compound phase analyzers

Build the analyzer modules from PHASES.md prompts 3.1-3.7.

Dependencies: types (completed)

Files to create (in order):
1. src/lib/analyzer/meta.ts
2. src/lib/analyzer/content.ts
3. src/lib/analyzer/technical.ts
4. src/lib/analyzer/aeo.ts
5. src/lib/scoring.ts
6. src/lib/analyzer/index.ts (combines all)
7. src/lib/analyzer/aggregator.ts

Each analyzer is independent. The index.ts combines them.
The aggregator depends on all analyzers.

Validate each analyzer returns CheckItem[] with correct structure.
```

---

### Phase 4: Orchestrator

```
/compound phase orchestrator

Build the orchestrator from PHASES.md prompts 4.1-4.2.

Dependencies: 
- types (completed)
- crawler (completed)
- analyzers (completed)

Files to create:
1. src/lib/orchestrator/index.ts

This is the most complex module. It:
- Imports SiteCrawler from crawler
- Imports analyzePages, aggregateSiteAnalysis from analyzers
- Manages state machine transitions
- Emits events for real-time updates

Validate:
- All state transitions are valid
- Events are properly typed
- Error handling doesn't crash the machine
```

---

### Phase 5: API Routes

```
/compound phase api

Build the API routes from PHASES.md prompts 4.2 and 5.1.

Dependencies:
- orchestrator (completed)
- Will need OpenAI setup

Files to create:
1. src/lib/openai.ts
2. src/app/api/analyze/stream/route.ts

The SSE endpoint is critical. Validate:
- Stream properly formats events
- Errors are sent before closing
- maxDuration is set for Vercel
```

---

### Phase 6: Frontend

```
/compound phase frontend

Build React components from PHASES.md prompts 6.1-6.7.

Dependencies:
- types (for prop types)
- API routes (for data fetching)

Build in order (simpler to complex):
1. src/components/score-card.tsx (standalone)
2. src/components/check-item.tsx (standalone)
3. src/components/crawl-settings.tsx (standalone)
4. src/components/crawl-progress.tsx (uses types)
5. src/components/site-overview.tsx (uses score-card)
6. src/components/page-list.tsx (uses types)
7. src/components/ai-recommendations.tsx (uses types)
8. src/app/page.tsx (uses all components)

Validate each component:
- Props are typed
- Renders without errors
- Handles loading/empty states
```

---

### Phase 7: Database & Polish

```
/compound phase database

Build Supabase integration from PHASES.md prompts 7.1-7.2.

Files to create:
1. src/lib/supabase.ts

Then create the schema in Supabase dashboard using the SQL from 7.1.

Finally, add error handling (7.3) across all modules.
```

---

## Compound Engineering Commands

### Check Build State

```
/compound status
```

Shows:
- Completed phases
- Current phase
- Pending phases
- Any validation errors

### Validate Dependencies

```
/compound validate
```

Checks:
- All imports resolve
- No circular dependencies
- Types are consistent
- Exports match imports

### Rebuild a Phase

If something breaks:

```
/compound rebuild crawler
```

Rebuilds the crawler phase while preserving dependent phases.

### View Dependency Graph

```
/compound graph
```

Shows visual dependency tree:

```
types/
├── crawler.ts
├── analysis.ts
└── orchestrator.ts
    │
    ├── crawler/
    │   ├── queue.ts
    │   ├── fetcher.ts
    │   ├── link-extractor.ts
    │   └── index.ts
    │
    ├── analyzer/
    │   ├── meta.ts
    │   ├── content.ts
    │   ├── technical.ts
    │   ├── aeo.ts
    │   ├── index.ts
    │   └── aggregator.ts
    │
    └── orchestrator/
        └── index.ts
            │
            ├── api/
            │   └── analyze/stream/route.ts
            │
            └── components/
                └── ... (all frontend)
```

### Fix Errors

When Claude Code encounters an error:

```
/compound fix

Error in src/lib/crawler/fetcher.ts:
- CircuitBreaker class missing export
- Type 'CrawledPage' not imported

Fix these issues and re-validate.
```

### Resume After Break

If you close Claude Code and return later:

```
/compound resume

Continue building the SEO Analyzer. 
Last completed: Phase 3 (analyzers)
Next: Phase 4 (orchestrator)
```

Claude Code will reload context from the dependency graph.

---

## Workflow Example

Here's a full session workflow:

```
# Session 1: Setup and Types
/plugins enable compound-engineering
/compound init
[paste README.md]

/compound phase types
[Claude builds types]
/compound validate
✓ Types complete

# Session 2: Crawler
/compound resume
/compound phase crawler
[Claude builds crawler modules]
/compound validate
✓ Crawler complete

# Session 3: Analyzers
/compound resume
/compound phase analyzers
[Claude builds analyzers]

# Oops, error in scoring.ts
/compound fix
[Claude fixes the error]
/compound validate
✓ Analyzers complete

# Session 4: Orchestrator + API
/compound resume
/compound phase orchestrator
/compound phase api
/compound validate
✓ Backend complete

# Session 5: Frontend
/compound resume
/compound phase frontend
/compound validate
✓ Frontend complete

# Session 6: Database + Deploy
/compound resume
/compound phase database
/compound status
✓ All phases complete

# Final validation
/compound validate --full
✓ Project ready for deployment
```

---

## Tips

1. **One phase at a time** - Don't rush. Validate after each phase.

2. **Use /compound fix** - When errors occur, let the plugin diagnose and fix.

3. **Check status often** - `/compound status` shows what's done and what's next.

4. **Resume works** - You can close Claude Code and resume later. Context is preserved.

5. **Rebuild sparingly** - Only rebuild a phase if validation fails. It preserves dependent code.

6. **Validate before moving on** - Always `/compound validate` before starting the next phase.

---

## Troubleshooting

### "Circular dependency detected"

```
/compound graph
```

Find the cycle and refactor. Usually means a type should be in a shared file.

### "Import not found"

```
/compound validate
```

Shows which imports are broken. Usually a missing export.

### "Context lost"

```
/compound resume

Here's the project structure:
[paste folder tree]

Here are the completed files:
[list them]
```

### "Phase failed"

```
/compound rebuild [phase-name]
```

Rebuilds from scratch while keeping other phases.

---

## Full Command Reference

| Command | Description |
|---------|-------------|
| `/compound init` | Initialize project with architecture |
| `/compound phase [name]` | Build a specific phase |
| `/compound status` | Show build progress |
| `/compound validate` | Check all dependencies |
| `/compound graph` | Show dependency tree |
| `/compound fix` | Auto-fix current errors |
| `/compound rebuild [phase]` | Rebuild a phase |
| `/compound resume` | Continue from last state |
| `/compound reset` | Start over (careful!) |
