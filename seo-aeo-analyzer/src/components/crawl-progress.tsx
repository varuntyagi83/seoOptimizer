'use client'

import { Progress } from '@/components/ui/progress'
import type { OrchestratorState } from '@/types/orchestrator'
import type { CrawlProgress } from '@/types/crawler'

interface CrawlProgressProps {
  state: OrchestratorState
  progress: CrawlProgress
  log: string[]
}

const STATE_CONFIG: Record<OrchestratorState, { label: string; color: string; icon: string }> = {
  idle:           { label: 'Idle',             color: 'text-slate-400 dark:text-slate-500',  icon: '○' },
  initializing:   { label: 'Initializing…',    color: 'text-blue-500 dark:text-blue-400',    icon: '◌' },
  crawling:       { label: 'Crawling pages…',  color: 'text-cyan-500 dark:text-cyan-400',    icon: '⟳' },
  analyzing:      { label: 'Analyzing pages…', color: 'text-violet-500 dark:text-violet-400',icon: '◈' },
  aggregating:    { label: 'Aggregating…',     color: 'text-indigo-500 dark:text-indigo-400',icon: '◉' },
  'ai-processing':{ label: 'AI thinking…',     color: 'text-amber-500 dark:text-amber-400',  icon: '✦' },
  complete:       { label: 'Complete',          color: 'text-emerald-500 dark:text-emerald-400',icon: '✓' },
  error:          { label: 'Error',             color: 'text-red-500 dark:text-red-400',      icon: '✕' },
  cancelled:      { label: 'Cancelled',         color: 'text-slate-400 dark:text-slate-500',  icon: '⊘' },
}

function getProgressPercent(state: OrchestratorState, progress: CrawlProgress): number {
  if (state === 'complete') return 100
  if (state === 'crawling') {
    if (progress.total === 0) return 5
    return Math.min(5 + Math.round((progress.completed / progress.total) * 45), 50)
  }
  if (state === 'analyzing')       return 55
  if (state === 'aggregating')     return 70
  if (state === 'ai-processing')   return 80
  if (state === 'initializing')    return 3
  return 0
}

export function CrawlProgressPanel({ state, progress, log }: CrawlProgressProps) {
  const config = STATE_CONFIG[state]
  const percent = getProgressPercent(state, progress)
  const isActive = !['idle', 'complete', 'error', 'cancelled'].includes(state)

  return (
    <div className="space-y-4">
      {/* State indicator */}
      <div className="flex items-center gap-2">
        <span className={`text-lg ${config.color} ${isActive ? 'animate-spin' : ''}`}
              style={state === 'crawling' ? { animationDuration: '1s' } : {}}>
          {config.icon}
        </span>
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        {state === 'crawling' && progress.total > 0 && (
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {progress.completed}/{progress.total} pages
            {progress.pagesPerSecond > 0 && ` · ${progress.pagesPerSecond}/s`}
          </span>
        )}
        {state === 'crawling' && progress.estimatedTimeRemaining > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-600 tabular-nums">
            ~{progress.estimatedTimeRemaining}s left
          </span>
        )}
      </div>

      {/* Progress bar */}
      <Progress
        value={percent}
        className="h-1.5 bg-slate-200 dark:bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-violet-500 [&>div]:transition-all [&>div]:duration-500"
      />

      {/* Current URL */}
      {progress.currentUrl && (
        <p className="text-xs text-slate-400 dark:text-slate-600 truncate font-mono">
          → {progress.currentUrl}
        </p>
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div className="space-y-0.5 max-h-28 overflow-y-auto">
          {log.slice(-5).reverse().map((entry, i) => (
            <p
              key={i}
              className="text-xs text-slate-400 dark:text-slate-500 truncate font-mono"
              style={{ opacity: 1 - i * 0.15 }}
            >
              {entry}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
