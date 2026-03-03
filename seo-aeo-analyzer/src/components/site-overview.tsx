'use client'

import { ScoreCard } from './score-card'
import type { SiteAnalysis } from '@/types/analysis'

interface SiteOverviewProps {
  analysis: SiteAnalysis
}

const SEVERITY_STYLES = {
  critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
  warning:  'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900/50',
  info:     'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50',
}

export function SiteOverview({ analysis }: SiteOverviewProps) {
  const { scores, stats, siteWideIssues, domain } = analysis
  const allIssues = [
    ...siteWideIssues.critical,
    ...siteWideIssues.warnings,
    ...siteWideIssues.opportunities,
  ]

  return (
    <div className="space-y-8">
      {/* Domain + scores */}
      <div className="text-center space-y-1">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">{domain}</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs">{stats.totalPages} pages crawled</p>
      </div>

      <div className="flex justify-center gap-10">
        <ScoreCard label="Overall" score={scores.overall} size={130} />
        <ScoreCard label="SEO" score={scores.seo} size={120} />
        <ScoreCard label="AEO" score={scores.aeo} size={120} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Avg Load Time', value: `${(stats.avgLoadTime / 1000).toFixed(2)}s`, warn: stats.avgLoadTime > 3000 },
          { label: 'Without H1', value: `${stats.pagesWithoutH1}/${stats.totalPages}`, warn: stats.pagesWithoutH1 > 0 },
          { label: 'No Description', value: `${stats.pagesWithoutDescription}/${stats.totalPages}`, warn: stats.pagesWithoutDescription > 0 },
          { label: 'With Schema', value: `${stats.pagesWithStructuredData}/${stats.totalPages}`, warn: stats.pagesWithStructuredData < stats.totalPages },
          { label: 'With FAQ Schema', value: `${stats.pagesWithFaqSchema}/${stats.totalPages}`, warn: false },
          { label: 'Alt Text Issues', value: `${stats.imagesWithoutAlt} pages`, warn: stats.imagesWithoutAlt > 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-lg font-semibold tabular-nums ${warn ? 'text-yellow-500 dark:text-yellow-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Site-wide issues */}
      {allIssues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Site-Wide Issues</h3>
          <div className="space-y-2">
            {allIssues.map((issue) => (
              <div
                key={issue.type}
                className={`border rounded-lg p-3 text-sm ${SEVERITY_STYLES[issue.severity]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold">{issue.title}</span>
                    <span className="mx-2 opacity-50">·</span>
                    <span className="opacity-80">{issue.description}</span>
                  </div>
                  <span className="text-xs opacity-60 shrink-0">{issue.count} page{issue.count !== 1 ? 's' : ''}</span>
                </div>
                <p className="mt-1 opacity-70 text-xs">{issue.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
