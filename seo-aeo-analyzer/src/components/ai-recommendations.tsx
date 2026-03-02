'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { AIRecommendations, Recommendation, PageRecommendation } from '@/types/analysis'

interface AIRecommendationsProps {
  recommendations: AIRecommendations
}

const TABS = [
  { key: 'siteWide',     label: 'Site-Wide',   icon: '◈' },
  { key: 'critical',     label: 'Critical',    icon: '⚠' },
  { key: 'important',    label: 'Important',   icon: '↑' },
  { key: 'quickWins',    label: 'Quick Wins',  icon: '⚡' },
  { key: 'enhancements', label: 'Enhancements',icon: '✦' },
  { key: 'pageSpecific', label: 'Pages',       icon: '⊞' },
] as const

type TabKey = typeof TABS[number]['key']

const IMPACT_STYLES = {
  high:   'bg-red-950/40 text-red-400 border-red-900/50',
  medium: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  low:    'bg-slate-800 text-slate-400 border-slate-700',
}

const EFFORT_STYLES = {
  low:    'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
  medium: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  high:   'bg-red-950/40 text-red-400 border-red-900/50',
}

const SCORE_COLOR = (score: number) =>
  score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'

function ExecutiveSummaryPanel({ summary }: { summary: AIRecommendations['executiveSummary'] }) {
  if (!summary.narrative && !summary.scoreContext && !summary.biggestWin) return null

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-4 space-y-3 mb-5">
      <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-widest">
        <span>◎</span>
        <span>Executive Summary</span>
      </div>

      {summary.narrative && (
        <p className="text-sm text-slate-300 leading-relaxed">{summary.narrative}</p>
      )}

      {summary.scoreContext && (
        <div className="border-l-2 border-cyan-800/60 pl-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Score Context</p>
          <p className="text-xs text-slate-400 leading-relaxed">{summary.scoreContext}</p>
        </div>
      )}

      {summary.biggestWin && (
        <div className="flex gap-2 items-start rounded-lg bg-emerald-950/30 border border-emerald-900/40 px-3 py-2">
          <span className="text-emerald-400 text-sm shrink-0">⚡</span>
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">Biggest Win</p>
            <p className="text-xs text-slate-300 leading-relaxed">{summary.biggestWin}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-900/40 overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-slate-800/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200">{rec.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{rec.description}</p>
          </div>
          <div className="flex gap-1.5 shrink-0 mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${IMPACT_STYLES[rec.impact]}`}>
              {rec.impact} impact
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${EFFORT_STYLES[rec.effort]}`}>
              {rec.effort} effort
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60 pt-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Action</p>
            <p className="text-xs text-slate-300 leading-relaxed">{rec.action}</p>
          </div>

          {rec.affectedPages && rec.affectedPages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Affected Pages ({rec.affectedPages.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {rec.affectedPages.slice(0, 5).map(url => (
                  <span key={url} className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                    {url.replace(/^https?:\/\//, '')}
                  </span>
                ))}
                {rec.affectedPages.length > 5 && (
                  <span className="text-[10px] text-slate-600">+{rec.affectedPages.length - 5} more</span>
                )}
              </div>
            </div>
          )}

          {rec.codeSnippet && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Code Snippet</p>
              <pre className="text-[11px] bg-slate-950 border border-slate-800 rounded p-3 overflow-x-auto text-cyan-300 font-mono leading-relaxed whitespace-pre-wrap">
                {rec.codeSnippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PageSpecificCard({ page }: { page: PageRecommendation }) {
  const [expanded, setExpanded] = useState(false)
  const slug = page.url.replace(/^https?:\/\/[^/]+/, '') || '/'

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-900/40 overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-slate-800/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                #{page.priority}
              </span>
              <p className="text-sm font-semibold text-slate-200 truncate">{slug}</p>
            </div>
            <p className="text-[10px] font-mono text-slate-600 truncate">{page.url}</p>
          </div>
          <div className="flex gap-2 shrink-0 mt-0.5">
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Overall</p>
              <p className={`text-sm font-bold ${SCORE_COLOR(page.scoreBreakdown.overall)}`}>
                {page.scoreBreakdown.overall}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">SEO</p>
              <p className={`text-sm font-bold ${SCORE_COLOR(page.scoreBreakdown.seo)}`}>
                {page.scoreBreakdown.seo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">AEO</p>
              <p className={`text-sm font-bold ${SCORE_COLOR(page.scoreBreakdown.aeo)}`}>
                {page.scoreBreakdown.aeo}
              </p>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60 pt-3">
          {page.topIssues.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Top Issues</p>
              <ul className="space-y-1">
                {page.topIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-red-500 shrink-0 mt-0.5">✗</span>
                    <span className="leading-relaxed">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page.fixes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Fixes</p>
              <ul className="space-y-1.5">
                {page.fixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                    <span className="leading-relaxed">{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AIRecommendationsPanel({ recommendations }: AIRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('siteWide')

  function tabCount(key: TabKey): number {
    if (key === 'pageSpecific') return recommendations.pageSpecific?.length ?? 0
    return recommendations[key as keyof Omit<AIRecommendations, 'executiveSummary' | 'pageSpecific'>]?.length ?? 0
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      {recommendations.executiveSummary && (
        <ExecutiveSummaryPanel summary={recommendations.executiveSummary} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const count = tabCount(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/60'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1 py-0 min-w-4 text-center ${
                    isActive ? 'border-cyan-700 text-cyan-500' : 'border-slate-700 text-slate-600'
                  }`}
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Recommendation cards */}
      <div className="space-y-2">
        {activeTab === 'pageSpecific' ? (
          recommendations.pageSpecific?.length ? (
            recommendations.pageSpecific.map((page, i) => (
              <PageSpecificCard key={i} page={page} />
            ))
          ) : (
            <div className="py-8 text-center text-slate-600 text-sm">No page-specific recommendations</div>
          )
        ) : (
          (() => {
            const current = recommendations[activeTab as keyof Omit<AIRecommendations, 'executiveSummary' | 'pageSpecific'>] as Recommendation[]
            return current?.length ? (
              current.map((rec, i) => <RecommendationCard key={i} rec={rec} />)
            ) : (
              <div className="py-8 text-center text-slate-600 text-sm">
                No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} recommendations
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}
