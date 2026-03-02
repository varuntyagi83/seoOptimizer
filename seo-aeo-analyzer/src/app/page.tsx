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
import type { SiteAnalysis, PageAnalysis } from '@/types/analysis'
import type { OrchestratorState } from '@/types/orchestrator'
import type { CrawlProgress } from '@/types/crawler'

const DEFAULT_PROGRESS: CrawlProgress = {
  total: 0, completed: 0, failed: 0,
  currentUrl: null, pagesPerSecond: 0, estimatedTimeRemaining: 0,
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

  const esRef = useRef<EventSource | null>(null)
  const completeReceivedRef = useRef(false)
  const isRunning = !['idle', 'complete', 'error', 'cancelled'].includes(state)

  function addLog(msg: string) {
    setLog(prev => [...prev.slice(-49), msg])
  }

  const startAnalysis = useCallback(() => {
    if (!url.trim()) return
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    // Close any existing connection before starting a new one
    esRef.current?.close()
    completeReceivedRef.current = false

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
      // Only show in the error banner if it's a fatal error (no specific page URL)
      // Per-page failures are just logged — the analysis continues with other pages
      if (!failedUrl) {
        setError(message)
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
      // The server closes the connection after sending 'complete', which also fires
      // onerror. Guard against that race by checking if complete was already received.
      if (!completeReceivedRef.current) {
        setState(prev => !['complete', 'cancelled'].includes(prev) ? 'error' : prev)
      }
      es.close()
    }
  }, [url, maxPages, maxDepth])

  function stopAnalysis() {
    esRef.current?.close()
    setState('cancelled')
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-[#0a0a0f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              SEO <span className="text-cyan-400">&</span> AEO Analyzer
            </h1>
            <p className="text-xs text-slate-600">Multi-page · AI-powered · Real-time</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            GPT-4.1
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Input card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex gap-3">
            <Input
              placeholder="https://yoursite.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isRunning && startAnalysis()}
              disabled={isRunning}
              className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-500 font-mono selection:bg-cyan-400/40 selection:text-white"
            />
            {isRunning ? (
              <Button
                variant="outline"
                onClick={stopAnalysis}
                className="shrink-0 border-red-800 text-red-400 hover:bg-red-950/30 bg-transparent"
              >
                Stop
              </Button>
            ) : (
              <Button
                onClick={startAnalysis}
                disabled={!url.trim()}
                className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                Analyze
              </Button>
            )}
          </div>

          <CrawlSettings
            maxPages={maxPages}
            maxDepth={maxDepth}
            onChange={({ maxPages: p, maxDepth: d }) => { setMaxPages(p); setMaxDepth(d) }}
            disabled={isRunning}
          />
        </div>

        {/* Error banner */}
        {error && (
          <Alert className="border-red-900/50 bg-red-950/20 text-red-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress panel */}
        {state !== 'idle' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <CrawlProgressPanel state={state} progress={progress} log={log} />
          </div>
        )}

        {/* Results */}
        {analysis && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-slate-900 border border-slate-800 p-1">
              {[
                { value: 'overview', label: 'Overview' },
                { value: 'pages', label: `Pages (${analysis.pages.length})` },
                ...(analysis.aiRecommendations ? [{ value: 'ai', label: '✦ AI Recommendations' }] : []),
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 text-slate-500"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <SiteOverview analysis={analysis} />
            </TabsContent>

            <TabsContent value="pages" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
              <PageList
                pages={analysis.pages}
                onSelect={setSelectedPage}
                selectedUrl={selectedPage?.url}
              />

              {selectedPage && (
                <div className="border border-slate-800 rounded-xl p-5 space-y-4 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300 font-mono truncate">
                      {selectedPage.url}
                    </h3>
                    <button
                      onClick={() => setSelectedPage(null)}
                      className="text-slate-600 hover:text-slate-400 text-lg leading-none ml-2 shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  {(['meta', 'content', 'technical', 'aeo'] as const).map(section => (
                    <div key={section}>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {section}
                      </h4>
                      <div className="space-y-1.5">
                        {selectedPage[section].map(check => (
                          <div key={check.tag} className="flex items-start gap-2 text-xs">
                            <span className={`mt-0.5 shrink-0 ${
                              check.status === 'pass' ? 'text-emerald-500' :
                              check.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '✕'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-mono text-slate-400">{check.tag}</span>
                              <span className="mx-2 text-slate-700">·</span>
                              <span className="text-slate-500">{check.found}</span>
                              {check.recommendation && (
                                <p className="text-slate-600 mt-0.5 leading-relaxed">{check.recommendation}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {analysis.aiRecommendations && (
              <TabsContent value="ai" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <AIRecommendationsPanel recommendations={analysis.aiRecommendations} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </main>
  )
}
