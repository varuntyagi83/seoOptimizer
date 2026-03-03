'use client'

import { useState, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CrawlSettings } from '@/components/crawl-settings'
import { CrawlProgressPanel } from '@/components/crawl-progress'
import { SiteOverview } from '@/components/site-overview'
import { PageList } from '@/components/page-list'
import { AIRecommendationsPanel } from '@/components/ai-recommendations'
import { ThemeToggle } from '@/components/theme-toggle'
import type { SiteAnalysis, PageAnalysis } from '@/types/analysis'
import type { OrchestratorState } from '@/types/orchestrator'
import type { CrawlProgress } from '@/types/crawler'
import type { SavedAnalysis } from '@/lib/supabase'

const DEFAULT_PROGRESS: CrawlProgress = {
  total: 0, completed: 0, failed: 0,
  currentUrl: null, pagesPerSecond: 0, estimatedTimeRemaining: 0,
}

function savedToSiteAnalysis(saved: SavedAnalysis): SiteAnalysis {
  return {
    id: saved.id,
    domain: saved.domain,
    startUrl: saved.start_url,
    crawlConfig: {
      startUrl: saved.start_url,
      maxPages: saved.pages_crawled,
      maxDepth: 2,
      respectRobotsTxt: false,
      includeSitemap: false,
      concurrency: 3,
      timeout: 15000,
    },
    crawledAt: new Date(saved.created_at),
    completedAt: new Date(saved.created_at),
    scores: { overall: saved.overall_score, seo: saved.seo_score, aeo: saved.aeo_score },
    pages: saved.pages ?? [],
    siteWideIssues: saved.site_wide_issues,
    stats: saved.stats,
    aiRecommendations: saved.ai_recommendations ?? undefined,
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(25)
  const [maxDepth, setMaxDepth] = useState(2)

  const [state, setState] = useState<OrchestratorState>('idle')
  const [progress, setProgress] = useState<CrawlProgress>(DEFAULT_PROGRESS)
  const [log, setLog] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null)
  const [selectedPage, setSelectedPage] = useState<PageAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cachedResult, setCachedResult] = useState<SavedAnalysis | null>(null)
  const [checkingCache, setCheckingCache] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const esRef = useRef<EventSource | null>(null)
  const completeReceivedRef = useRef(false)
  const isRunning = !['idle', 'complete', 'error', 'cancelled'].includes(state)

  function addLog(msg: string) {
    setLog(prev => [...prev.slice(-49), msg])
  }

  function runSseAnalysis(normalizedUrl: string) {
    esRef.current?.close()
    completeReceivedRef.current = false
    setCachedResult(null)
    setError(null)
    setAnalysis(null)
    setSelectedPage(null)
    setLog([])
    setProgress(DEFAULT_PROGRESS)

    const params = new URLSearchParams({
      url: normalizedUrl,
      maxPages: String(maxPages),
      maxDepth: String(maxDepth),
    })

    const es = new EventSource(`/api/analyze/stream?${params}`)
    esRef.current = es

    es.addEventListener('state', (e) => {
      const { to } = JSON.parse((e as MessageEvent).data) as { from: string; to: OrchestratorState }
      setState(to)
      addLog(`→ ${to}`)
    })

    es.addEventListener('progress', (e) => {
      const p = JSON.parse((e as MessageEvent).data) as CrawlProgress
      setProgress(p)
      if (p.currentUrl) addLog(`crawled: ${p.currentUrl}`)
    })

    es.addEventListener('page', (e) => {
      const { url: pageUrl, scores } = JSON.parse((e as MessageEvent).data) as { url: string; scores: { overall: number } }
      addLog(`analyzed: ${pageUrl} (${scores.overall})`)
    })

    es.addEventListener('fail', (e) => {
      const msg = (e as MessageEvent).data
      if (!msg) return
      const { message, url: failedUrl } = JSON.parse(msg) as { message: string; url?: string }
      if (!failedUrl) {
        setError(message)
        setState('error')
        addLog(`error: ${message}`)
      } else {
        addLog(`skipped: ${failedUrl}`)
      }
    })

    es.addEventListener('complete', (e) => {
      const result = JSON.parse((e as MessageEvent).data) as SiteAnalysis
      completeReceivedRef.current = true
      setAnalysis(result)
      setState('complete')
      setError(null)
      es.close()
    })

    es.onerror = () => {
      if (!completeReceivedRef.current) {
        setState(prev => !['complete', 'cancelled'].includes(prev) ? 'error' : prev)
      }
      es.close()
    }
  }

  const startAnalysis = useCallback(async () => {
    if (!url.trim()) return
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    setCheckingCache(true)
    try {
      const res = await fetch(`/api/analyses/recent?url=${encodeURIComponent(normalizedUrl)}`)
      if (res.ok) {
        const data = await res.json() as { analysis: SavedAnalysis | null }
        if (data.analysis) {
          setCachedResult(data.analysis)
          setCheckingCache(false)
          return
        }
      }
    } catch {
      // Cache check failed — proceed with fresh analysis
    }
    setCheckingCache(false)
    runSseAnalysis(normalizedUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, maxPages, maxDepth])

  function useCachedResult() {
    if (!cachedResult) return
    setAnalysis(savedToSiteAnalysis(cachedResult))
    setState('complete')
    setCachedResult(null)
  }

  function rerunAnalysis() {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    runSseAnalysis(normalizedUrl)
  }

  function stopAnalysis() {
    esRef.current?.close()
    setState('cancelled')
  }

  async function handleExportReport() {
    if (!analysis) return
    setIsExporting(true)
    try {
      const { downloadReport } = await import('@/components/pdf-report')
      await downloadReport(analysis)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              SEO <span className="text-cyan-500 dark:text-cyan-400">&</span> AEO Analyzer
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-600">Multi-page · AI-powered · Real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              GPT-4.1
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Input card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex gap-3">
            <Input
              placeholder="https://yoursite.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isRunning && !checkingCache && startAnalysis()}
              disabled={isRunning || checkingCache}
              className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:ring-cyan-500 font-mono selection:bg-cyan-400/40 selection:text-white"
            />
            {isRunning ? (
              <Button
                variant="outline"
                onClick={stopAnalysis}
                className="shrink-0 border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 bg-transparent"
              >
                Stop
              </Button>
            ) : (
              <Button
                onClick={startAnalysis}
                disabled={!url.trim() || checkingCache}
                className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                {checkingCache ? '…' : 'Analyze'}
              </Button>
            )}
          </div>

          <CrawlSettings
            maxPages={maxPages}
            maxDepth={maxDepth}
            onChange={({ maxPages: p, maxDepth: d }) => { setMaxPages(p); setMaxDepth(d) }}
            disabled={isRunning || checkingCache}
          />
        </div>

        {/* Cached result prompt */}
        {cachedResult && (
          <div className="bg-white dark:bg-slate-900/50 border border-amber-200 dark:border-amber-900/50 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-500 dark:text-amber-400">◎</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Previous analysis found</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cachedResult.domain} · Analyzed {new Date(cachedResult.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {cachedResult.pages_crawled} pages crawled
                </p>
              </div>
              <div className="flex gap-4 shrink-0">
                {[
                  { label: 'Overall', score: cachedResult.overall_score },
                  { label: 'SEO',     score: cachedResult.seo_score },
                  { label: 'AEO',     score: cachedResult.aeo_score },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                    <p className={`text-lg font-bold tabular-nums ${score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {score}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={useCachedResult}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
              >
                Use this result
              </Button>
              <Button
                variant="outline"
                onClick={rerunAnalysis}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-sm bg-transparent"
              >
                Run new analysis
              </Button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <Alert className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress panel */}
        {state !== 'idle' && !cachedResult && (
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <CrawlProgressPanel state={state} progress={progress} log={log} />
          </div>
        )}

        {/* Results */}
        {analysis && (
          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 flex-1">
              {[
                { value: 'overview', label: 'Overview' },
                { value: 'pages', label: analysis.pages.length > 0 ? `Pages (${analysis.pages.length})` : 'Pages' },
                ...(analysis.aiRecommendations ? [{ value: 'ai', label: '✦ AI Recommendations' }] : []),
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-500 dark:data-[state=active]:text-cyan-400 text-slate-400 dark:text-slate-500"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
              </TabsList>
              <Button
                onClick={handleExportReport}
                disabled={isExporting}
                className="shrink-0 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 dark:border-slate-600 font-medium text-sm flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Export Report
                  </>
                )}
              </Button>
            </div>

            <TabsContent value="overview" className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <SiteOverview analysis={analysis} />
            </TabsContent>

            <TabsContent value="pages" className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
              {analysis.pages.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-4 text-center">
                  <span className="text-3xl text-slate-300 dark:text-slate-700">⊞</span>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Page-by-page data not available</p>
                    <p className="text-xs text-slate-400 dark:text-slate-600 max-w-sm leading-relaxed">
                      Cached results don&apos;t include per-page breakdowns. Run a new analysis to see detailed scores and checks for each page.
                    </p>
                  </div>
                  <Button
                    onClick={rerunAnalysis}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm mt-1"
                  >
                    Run new analysis
                  </Button>
                </div>
              ) : (
                <>
                <PageList
                  pages={analysis.pages}
                  onSelect={setSelectedPage}
                  selectedUrl={selectedPage?.url}
                />

                {selectedPage && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-slate-50 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono truncate">
                        {selectedPage.url}
                      </h3>
                      <button
                        onClick={() => setSelectedPage(null)}
                        className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 text-lg leading-none ml-2 shrink-0"
                      >
                        ×
                      </button>
                    </div>

                    {(['meta', 'content', 'technical', 'aeo'] as const).map(section => (
                      <div key={section}>
                        <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          {section}
                        </h4>
                        <div className="space-y-1.5">
                          {selectedPage[section].map(check => (
                            <div key={check.tag} className="flex items-start gap-2 text-xs">
                              <span className={`mt-0.5 shrink-0 ${
                                check.status === 'pass' ? 'text-emerald-500' :
                                check.status === 'warning' ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'
                              }`}>
                                {check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '✕'}
                              </span>
                              <div className="min-w-0">
                                <span className="font-mono text-slate-600 dark:text-slate-400">{check.tag}</span>
                                <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-slate-700 dark:text-slate-300">{check.found}</span>
                                {check.recommendation && (
                                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{check.recommendation}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </>
              )}
            </TabsContent>

            {analysis.aiRecommendations && (
              <TabsContent value="ai" className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <AIRecommendationsPanel recommendations={analysis.aiRecommendations} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </main>
  )
}
