'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { PageAnalysis } from '@/types/analysis'

interface PageListProps {
  pages: PageAnalysis[]
  onSelect: (page: PageAnalysis) => void
  selectedUrl?: string
}

type SortKey = 'overall' | 'seo' | 'aeo' | 'url'
type Filter = 'all' | 'issues'

function scoreColor(score: number): string {
  if (score >= 80) return 'text-cyan-500 dark:text-cyan-400'
  if (score >= 60) return 'text-lime-600 dark:text-lime-400'
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function issueCount(page: PageAnalysis): number {
  return [...page.meta, ...page.content, ...page.technical, ...page.aeo]
    .filter(c => c.status !== 'pass').length
}

export function PageList({ pages, onSelect, selectedUrl }: PageListProps) {
  const [sort, setSort] = useState<SortKey>('overall')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const [filter, setFilter] = useState<Filter>('all')

  function toggleSort(key: SortKey) {
    if (sort === key) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setDir('asc') }
  }

  const sorted = [...pages]
    .filter(p => filter === 'all' || issueCount(p) > 0)
    .sort((a, b) => {
      let cmp = 0
      if (sort === 'url') cmp = a.url.localeCompare(b.url)
      else cmp = a.scores[sort] - b.scores[sort]
      return dir === 'asc' ? cmp : -cmp
    })

  function SortHeader({ label, col }: { label: string; col: SortKey }) {
    const active = sort === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
          active ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        {label}
        <span className="text-slate-300 dark:text-slate-600">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter + hint */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'issues'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filter === f
                  ? 'border-cyan-500 text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {f === 'all' ? `All (${pages.length})` : `Has Issues (${pages.filter(p => issueCount(p) > 0).length})`}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Click a row to see detailed analysis</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <tr>
              <th className="text-left px-4 py-2.5"><SortHeader label="URL" col="url" /></th>
              <th className="text-right px-3 py-2.5"><SortHeader label="Overall" col="overall" /></th>
              <th className="text-right px-3 py-2.5"><SortHeader label="SEO" col="seo" /></th>
              <th className="text-right px-3 py-2.5"><SortHeader label="AEO" col="aeo" /></th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Issues</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((page, i) => {
              const issues = issueCount(page)
              const isSelected = page.url === selectedUrl
              return (
                <tr
                  key={page.url}
                  onClick={() => onSelect(page)}
                  title="Click to see detailed analysis"
                  className={`border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/20 border-l-2 border-l-cyan-500'
                      : i % 2 === 0
                        ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        : 'bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {page.url.replace(/^https?:\/\//, '')}
                    {page.depth === 0 && (
                      <Badge variant="outline" className="ml-2 text-[10px] border-cyan-400 dark:border-cyan-800 text-cyan-600 dark:text-cyan-600 py-0">home</Badge>
                    )}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${scoreColor(page.scores.overall)}`}>
                    {page.scores.overall}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${scoreColor(page.scores.seo)}`}>
                    {page.scores.seo}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${scoreColor(page.scores.aeo)}`}>
                    {page.scores.aeo}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {issues > 0 ? (
                      <span className="text-xs text-red-500 dark:text-red-400 font-semibold">{issues}</span>
                    ) : (
                      <span className="text-xs text-emerald-500">✓</span>
                    )}
                  </td>
                  <td className="pr-3 text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors text-xs">
                    ›
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-8 text-center text-slate-400 dark:text-slate-600 text-sm">No pages match the filter</div>
        )}
      </div>
    </div>
  )
}
