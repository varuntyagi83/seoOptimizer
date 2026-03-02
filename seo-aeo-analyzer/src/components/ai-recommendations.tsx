'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { AIRecommendations, Recommendation } from '@/types/analysis'

interface AIRecommendationsProps {
  recommendations: AIRecommendations
}

const TABS = [
  { key: 'siteWide',     label: 'Site-Wide',   icon: '◈' },
  { key: 'critical',     label: 'Critical',    icon: '⚠' },
  { key: 'important',    label: 'Important',   icon: '↑' },
  { key: 'quickWins',    label: 'Quick Wins',  icon: '⚡' },
  { key: 'enhancements', label: 'Enhancements',icon: '✦' },
] as const

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

export function AIRecommendationsPanel({ recommendations }: AIRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('siteWide')

  const current = recommendations[activeTab]

  function tabCount(key: typeof TABS[number]['key']): number {
    return recommendations[key].length
  }

  return (
    <div className="space-y-4">
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
        {current.length === 0 ? (
          <div className="py-8 text-center text-slate-600 text-sm">
            No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} recommendations
          </div>
        ) : (
          current.map((rec, i) => <RecommendationCard key={i} rec={rec} />)
        )}
      </div>
    </div>
  )
}
