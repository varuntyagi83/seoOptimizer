'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'
import type { SiteAnalysis, PageAnalysis, SiteIssue } from '@/types/analysis'

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  navy:     '#0a0f1e',
  navyMid:  '#0f172a',
  navyCard: '#1e293b',
  navyBdr:  '#334155',
  cyan:     '#06b6d4',
  cyanDim:  '#0891b2',
  white:    '#f8fafc',
  muted:    '#94a3b8',
  dim:      '#64748b',
  green:    '#10b981',
  yellow:   '#f59e0b',
  red:      '#ef4444',
  orange:   '#f97316',
  purple:   '#8b5cf6',
  border:   '#1e293b',
  textSoft: '#cbd5e1',
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Layout
  page: { backgroundColor: C.navyMid, fontFamily: 'Helvetica', color: C.white, padding: 0 },
  pageLight: { backgroundColor: '#f8fafc', fontFamily: 'Helvetica', color: C.navyMid, padding: 0 },
  section: { margin: '32 40' },
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  flex1: { flex: 1 },

  // Cover
  coverPage: { backgroundColor: C.navy, flexDirection: 'column' },
  coverAccent: { height: 4, backgroundColor: C.cyan, width: '100%' },
  coverBody: { flex: 1, padding: '48 52', flexDirection: 'column', justifyContent: 'space-between' },
  coverTop: { flexDirection: 'column', gap: 8 },
  coverLabel: { fontSize: 9, letterSpacing: 3, color: C.cyan, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  coverTitle: { fontSize: 36, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: -0.5, lineHeight: 1.1 },
  coverSubtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  coverDivider: { height: 1, backgroundColor: C.navyCard, marginVertical: 28 },
  coverDomain: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.cyan, letterSpacing: -0.3 },
  coverMeta: { fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 1.6 },
  coverBottom: { flexDirection: 'column', gap: 6 },
  coverFooter: { fontSize: 8, color: C.dim, letterSpacing: 1 },

  // Score cards on cover
  coverScores: { flexDirection: 'row', gap: 12, marginTop: 28 },
  coverScoreCard: { flex: 1, backgroundColor: C.navyCard, borderRadius: 8, padding: '14 12', alignItems: 'center' },
  coverScoreValue: { fontSize: 28, fontFamily: 'Helvetica-Bold', letterSpacing: -1 },
  coverScoreLabel: { fontSize: 8, color: C.muted, marginTop: 3, letterSpacing: 1.5, textTransform: 'uppercase' },
  coverScoreBar: { height: 3, borderRadius: 2, marginTop: 8, width: '100%' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  sectionDot: { width: 4, height: 20, backgroundColor: C.cyan, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 9, color: C.dim, marginTop: 2 },

  // Content page header
  pageHeader: { backgroundColor: C.navy, padding: '14 40 12', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageHeaderBrand: { fontSize: 9, color: C.cyan, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  pageHeaderDomain: { fontSize: 9, color: C.dim, fontFamily: 'Helvetica' },
  pageFooter: { backgroundColor: C.navy, padding: '8 40', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.navyCard },
  pageFooterText: { fontSize: 7, color: C.dim },
  pageNum: { fontSize: 7, color: C.dim },
  pageContent: { flex: 1, padding: '24 40' },

  // Score section
  scoreGrid: { flexDirection: 'row', gap: 12 },
  scoreCard: { flex: 1, backgroundColor: C.navyCard, borderRadius: 10, padding: '20 16', alignItems: 'center', borderWidth: 1, borderColor: C.navyBdr },
  scoreCardMain: { flex: 2, backgroundColor: C.navyCard, borderRadius: 10, padding: '20 16', alignItems: 'center', borderWidth: 1, borderColor: C.navyBdr },
  scoreNum: { fontSize: 44, fontFamily: 'Helvetica-Bold', letterSpacing: -2 },
  scoreNumSm: { fontSize: 26, fontFamily: 'Helvetica-Bold', letterSpacing: -1 },
  scoreLbl: { fontSize: 9, color: C.muted, marginTop: 4, letterSpacing: 1.5, textTransform: 'uppercase' },
  scoreBarBg: { height: 4, backgroundColor: C.navyBdr, borderRadius: 2, width: '100%', marginTop: 12 },
  scoreBarFill: { height: 4, borderRadius: 2 },
  scoreMeaning: { fontSize: 8, color: C.dim, marginTop: 8, textAlign: 'center', lineHeight: 1.5 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '31.5%', backgroundColor: C.navyCard, borderRadius: 8, padding: '12 14', borderWidth: 1, borderColor: C.navyBdr },
  statValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  statLabel: { fontSize: 8, color: C.muted, letterSpacing: 0.5 },
  statWarn: { color: C.yellow },
  statOk: { color: C.white },

  // Issues
  issueCard: { borderRadius: 6, padding: '10 12', marginBottom: 8, borderLeftWidth: 3 },
  issueCritical: { backgroundColor: '#1f0f0f', borderLeftColor: C.red },
  issueWarning: { backgroundColor: '#1a1200', borderLeftColor: C.yellow },
  issueInfo: { backgroundColor: '#0c1a2e', borderLeftColor: C.cyan },
  issueTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  issueTitleCritical: { color: '#fca5a5' },
  issueTitleWarning: { color: '#fcd34d' },
  issueTitleInfo: { color: '#67e8f9' },
  issueDesc: { fontSize: 8, lineHeight: 1.5 },
  issueDescCritical: { color: '#fca5a5' },
  issueDescWarning: { color: '#fcd34d' },
  issueDescInfo: { color: '#a5f3fc' },
  issueRec: { fontSize: 8, color: C.muted, marginTop: 4, lineHeight: 1.5 },
  issueMeta: { fontSize: 7, color: C.dim, marginTop: 4 },
  issueTag: { fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginRight: 4 },

  // Pages table
  table: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.navyBdr },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', padding: '8 12' },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dim, letterSpacing: 0.8, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '10 12', borderTopWidth: 1, borderTopColor: C.navyBdr },
  tableRowAlt: { backgroundColor: '#111827' },
  tableCell: { fontSize: 8, color: C.textSoft, lineHeight: 1.4 },
  tableCellUrl: { fontSize: 8, color: C.cyan, fontFamily: 'Helvetica', flex: 1, lineHeight: 1.4 },
  scoreChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', minWidth: 34 },

  // Check items
  checkSection: { marginBottom: 14 },
  checkSectionTitle: { fontSize: 8, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  checkItem: { flexDirection: 'row', gap: 6, marginBottom: 5, alignItems: 'flex-start' },
  checkDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  checkDotPass: { backgroundColor: C.green },
  checkDotWarn: { backgroundColor: C.yellow },
  checkDotFail: { backgroundColor: C.red },
  checkTag: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.textSoft, width: 120 },
  checkFound: { fontSize: 8, color: C.muted, flex: 1 },
  checkRec: { fontSize: 7, color: C.dim, marginLeft: 12, marginBottom: 2, lineHeight: 1.4 },

  // Page detail card
  pageDetailCard: { backgroundColor: C.navyCard, borderRadius: 8, padding: '14 16', marginBottom: 14, borderWidth: 1, borderColor: C.navyBdr },
  pageDetailUrl: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.cyan, marginBottom: 8, lineHeight: 1.4 },
  pageDetailScores: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pageDetailScoreChip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageDetailScoreLabel: { fontSize: 7, color: C.muted },
  pageDetailScoreVal: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Divider
  divider: { height: 1, backgroundColor: C.navyBdr, marginVertical: 16 },

  // Badges
  badge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', marginRight: 4 },
  badgeRed: { backgroundColor: '#450a0a', color: C.red },
  badgeYellow: { backgroundColor: '#422006', color: C.yellow },
  badgeGreen: { backgroundColor: '#052e16', color: C.green },
  badgeBlue: { backgroundColor: '#0c1a2e', color: C.cyan },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return C.green
  if (s >= 60) return C.yellow
  return C.red
}

function scoreLabel(s: number) {
  if (s >= 90) return 'Excellent'
  if (s >= 80) return 'Good'
  if (s >= 60) return 'Needs Work'
  return 'Poor'
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

function formatUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ domain }: { domain: string }) {
  return (
    <View style={S.pageHeader}>
      <Text style={S.pageHeaderBrand}>SEO & AEO ANALYZER</Text>
      <Text style={S.pageHeaderDomain}>{domain}</Text>
    </View>
  )
}

function PageFooter({ pageNum, total }: { pageNum: string; total: string }) {
  return (
    <View style={S.pageFooter}>
      <Text style={S.pageFooterText}>Confidential — Generated by SEO & AEO Analyzer</Text>
      <Text style={S.pageNum}>{pageNum} / {total}</Text>
    </View>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={S.sectionHeader}>
      <View style={S.sectionDot} />
      <View>
        <Text style={S.sectionTitle}>{title}</Text>
        {subtitle && <Text style={S.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  )
}

function ScoreChip({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const color = scoreColor(score)
  const bg = score >= 80 ? '#052e16' : score >= 60 ? '#422006' : '#450a0a'
  return (
    <View style={[S.scoreChip, { backgroundColor: bg, color }]}>
      <Text style={{ fontSize: size === 'md' ? 11 : 9, fontFamily: 'Helvetica-Bold', color }}>{score}</Text>
    </View>
  )
}

function IssueBlock({ issue }: { issue: SiteIssue }) {
  const isCard = issue.severity === 'critical' ? S.issueCritical
    : issue.severity === 'warning' ? S.issueWarning : S.issueInfo
  const titleStyle = issue.severity === 'critical' ? S.issueTitleCritical
    : issue.severity === 'warning' ? S.issueTitleWarning : S.issueTitleInfo
  const descStyle = issue.severity === 'critical' ? S.issueDescCritical
    : issue.severity === 'warning' ? S.issueDescWarning : S.issueDescInfo

  return (
    <View style={[S.issueCard, isCard]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={[S.issueTitle, titleStyle]}>{issue.title}</Text>
        <Text style={[S.issueTag, { backgroundColor: issue.severity === 'critical' ? '#450a0a' : issue.severity === 'warning' ? '#422006' : '#0c1a2e', color: issue.severity === 'critical' ? C.red : issue.severity === 'warning' ? C.yellow : C.cyan }]}>
          {issue.count} page{issue.count !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={[S.issueDesc, descStyle]}>{issue.description}</Text>
      <Text style={S.issueRec}>{issue.recommendation}</Text>
    </View>
  )
}


// ─── Pages ────────────────────────────────────────────────────────────────────

function CoverPage({ analysis }: { analysis: SiteAnalysis }) {
  const { domain, scores, stats, crawledAt } = analysis
  const date = new Date(crawledAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Page size="A4" style={[S.page, S.coverPage]}>
      <View style={S.coverAccent} />
      <View style={S.coverBody}>
        <View style={S.coverTop}>
          <Text style={S.coverLabel}>Analysis Report</Text>
          <Text style={S.coverTitle}>SEO & AEO{'\n'}Audit Report</Text>
          <Text style={S.coverSubtitle}>Comprehensive multi-page site analysis</Text>

          <View style={S.coverDivider} />

          <Text style={S.coverDomain}>{domain}</Text>
          <Text style={S.coverMeta}>
            {stats.totalPages} pages analyzed  ·  {date}  ·  Depth {analysis.crawlConfig.maxDepth}
          </Text>

          {/* Score cards */}
          <View style={S.coverScores}>
            {[
              { label: 'Overall Score', score: scores.overall, accent: true },
              { label: 'SEO Score', score: scores.seo, accent: false },
              { label: 'AEO Score', score: scores.aeo, accent: false },
            ].map(({ label, score }) => (
              <View key={label} style={S.coverScoreCard}>
                <Text style={[S.coverScoreValue, { color: scoreColor(score) }]}>{score}</Text>
                <Text style={S.coverScoreLabel}>{label}</Text>
                <View style={S.coverScoreBar}>
                  <View style={[S.coverScoreBar, { width: `${score}%`, backgroundColor: scoreColor(score), marginTop: 0 }]} />
                </View>
                <Text style={{ fontSize: 8, color: C.dim, marginTop: 5 }}>{scoreLabel(score)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.coverBottom}>
          <View style={{ height: 1, backgroundColor: C.navyCard, marginBottom: 12 }} />
          <Text style={S.coverFooter}>CONFIDENTIAL  ·  SEO & AEO ANALYZER  ·  AI-POWERED</Text>
          <Text style={[S.coverFooter, { marginTop: 3, color: '#475569' }]}>
            This report contains proprietary site analysis. Not for redistribution.
          </Text>
        </View>
      </View>
    </Page>
  )
}

function ScoresPage({ analysis }: { analysis: SiteAnalysis }) {
  const { scores, stats } = analysis

  return (
    <Page size="A4" style={S.page}>
      <PageHeader domain={analysis.domain} />
      <View style={S.pageContent}>
        <SectionHeader title="Score Breakdown" subtitle="Overall performance across SEO and AEO dimensions" />

        {/* Main scores */}
        <View style={S.scoreGrid}>
          <View style={[S.scoreCardMain, { borderColor: scoreColor(scores.overall) + '40' }]}>
            <Text style={{ fontSize: 9, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Overall Score</Text>
            <Text style={[S.scoreNum, { color: scoreColor(scores.overall) }]}>{scores.overall}</Text>
            <Text style={[S.scoreLbl, { color: scoreColor(scores.overall) }]}>{scoreLabel(scores.overall)}</Text>
            <View style={S.scoreBarBg}>
              <View style={[S.scoreBarFill, { width: `${scores.overall}%`, backgroundColor: scoreColor(scores.overall) }]} />
            </View>
            <Text style={S.scoreMeaning}>
              Combined: 60% SEO · 40% AEO
            </Text>
          </View>

          <View style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'SEO Score', score: scores.seo, note: 'Meta 25% · Content 35% · Technical 40%' },
              { label: 'AEO Score', score: scores.aeo, note: 'Answer Engine Optimization' },
            ].map(({ label, score, note }) => (
              <View key={label} style={[S.scoreCard, { borderColor: scoreColor(score) + '40', flex: 0 }]}>
                <Text style={{ fontSize: 9, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
                <Text style={[S.scoreNumSm, { color: scoreColor(score) }]}>{score}</Text>
                <Text style={[S.scoreLbl, { color: scoreColor(score) }]}>{scoreLabel(score)}</Text>
                <View style={S.scoreBarBg}>
                  <View style={[S.scoreBarFill, { width: `${score}%`, backgroundColor: scoreColor(score) }]} />
                </View>
                <Text style={S.scoreMeaning}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.divider} />

        {/* Stats grid */}
        <SectionHeader title="Site Statistics" />
        <View style={S.statsGrid}>
          {[
            { label: 'Total Pages', value: String(stats.totalPages), warn: false },
            { label: 'Avg Load Time', value: `${(stats.avgLoadTime / 1000).toFixed(2)}s`, warn: stats.avgLoadTime > 3000 },
            { label: 'Missing H1', value: `${stats.pagesWithoutH1} pages`, warn: stats.pagesWithoutH1 > 0 },
            { label: 'No Meta Desc', value: `${stats.pagesWithoutDescription} pages`, warn: stats.pagesWithoutDescription > 0 },
            { label: 'With Schema', value: `${stats.pagesWithStructuredData} / ${stats.totalPages}`, warn: stats.pagesWithStructuredData < stats.totalPages },
            { label: 'Alt Text Issues', value: `${stats.imagesWithoutAlt} pages`, warn: stats.imagesWithoutAlt > 0 },
          ].map(({ label, value, warn }) => (
            <View key={label} style={S.statCard}>
              <Text style={S.statLabel}>{label}</Text>
              <Text style={[S.statValue, warn ? S.statWarn : S.statOk]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
      <PageFooter pageNum="2" total="—" />
    </Page>
  )
}

function IssuesPage({ analysis }: { analysis: SiteAnalysis }) {
  const { siteWideIssues } = analysis
  const critical = siteWideIssues.critical
  const warnings = siteWideIssues.warnings
  const opps = siteWideIssues.opportunities

  return (
    <Page size="A4" style={S.page}>
      <PageHeader domain={analysis.domain} />
      <View style={S.pageContent}>
        <SectionHeader
          title="Site-Wide Issues"
          subtitle={`${critical.length} critical · ${warnings.length} warnings · ${opps.length} opportunities`}
        />

        {critical.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />
              <Text style={{ fontSize: 9, color: C.red, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 }}>
                CRITICAL  ·  {critical.length} issue{critical.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {critical.map(issue => <IssueBlock key={issue.type} issue={issue} />)}
          </View>
        )}

        {warnings.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.yellow }} />
              <Text style={{ fontSize: 9, color: C.yellow, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 }}>
                WARNINGS  ·  {warnings.length} issue{warnings.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {warnings.map(issue => <IssueBlock key={issue.type} issue={issue} />)}
          </View>
        )}

        {opps.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyan }} />
              <Text style={{ fontSize: 9, color: C.cyan, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 }}>
                OPPORTUNITIES  ·  {opps.length} item{opps.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {opps.map(issue => <IssueBlock key={issue.type} issue={issue} />)}
          </View>
        )}

        {critical.length === 0 && warnings.length === 0 && opps.length === 0 && (
          <View style={{ padding: '40 0', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, color: C.green, marginBottom: 8 }}>✓</Text>
            <Text style={{ fontSize: 12, color: C.green, fontFamily: 'Helvetica-Bold' }}>No site-wide issues found</Text>
            <Text style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>Your site is clean across all major checks.</Text>
          </View>
        )}
      </View>
      <PageFooter pageNum="3" total="—" />
    </Page>
  )
}

function PageSummaryTable({ analysis }: { analysis: SiteAnalysis }) {
  const pages = analysis.pages.slice(0, 30) // cap at 30 for table

  return (
    <Page size="A4" style={S.page}>
      <PageHeader domain={analysis.domain} />
      <View style={S.pageContent}>
        <SectionHeader
          title="Page Summary"
          subtitle={`Scores across ${analysis.pages.length} crawled pages`}
        />

        <View style={S.table}>
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCell, { flex: 1 }]}>URL</Text>
            <Text style={[S.tableHeaderCell, { width: 50, textAlign: 'center' }]}>Overall</Text>
            <Text style={[S.tableHeaderCell, { width: 40, textAlign: 'center' }]}>SEO</Text>
            <Text style={[S.tableHeaderCell, { width: 40, textAlign: 'center' }]}>AEO</Text>
            <Text style={[S.tableHeaderCell, { width: 35, textAlign: 'center' }]}>Issues</Text>
          </View>

          {pages.map((page, i) => {
            const issueCount = [...page.meta, ...page.content, ...page.technical, ...page.aeo]
              .filter(c => c.status === 'fail').length
            return (
              <View key={page.url} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                <Text style={S.tableCellUrl}>{formatUrl(truncate(page.url, 55))}</Text>
                <View style={{ width: 50, alignItems: 'center' }}>
                  <ScoreChip score={page.scores.overall} />
                </View>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <ScoreChip score={page.scores.seo} />
                </View>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <ScoreChip score={page.scores.aeo} />
                </View>
                <View style={{ width: 35, alignItems: 'center' }}>
                  {issueCount > 0 ? (
                    <Text style={[S.tableCell, { color: issueCount >= 3 ? C.red : C.yellow, fontFamily: 'Helvetica-Bold', textAlign: 'center' }]}>
                      {issueCount}
                    </Text>
                  ) : (
                    <Text style={[S.tableCell, { color: C.green, textAlign: 'center' }]}>✓</Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {analysis.pages.length > 30 && (
          <Text style={{ fontSize: 8, color: C.dim, marginTop: 8, textAlign: 'center' }}>
            Showing 30 of {analysis.pages.length} pages. See per-page details below.
          </Text>
        )}
      </View>
      <PageFooter pageNum="4" total="—" />
    </Page>
  )
}

function PageDetailCard({ page }: { page: PageAnalysis }) {
  const failCount = [...page.meta, ...page.content, ...page.technical, ...page.aeo].filter(c => c.status === 'fail').length
  const warnCount = [...page.meta, ...page.content, ...page.technical, ...page.aeo].filter(c => c.status === 'warning').length

  return (
    <View style={S.pageDetailCard} wrap={false}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={[S.pageDetailUrl, { flex: 1, marginRight: 8 }]}>{formatUrl(page.url)}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ backgroundColor: '#0c1a2e', borderRadius: 4, padding: '2 6' }}>
            <Text style={{ fontSize: 7, color: C.cyan }}>D{page.depth}</Text>
          </View>
          {failCount > 0 && (
            <View style={{ backgroundColor: '#450a0a', borderRadius: 4, padding: '2 6' }}>
              <Text style={{ fontSize: 7, color: C.red }}>{failCount} fail{failCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {warnCount > 0 && (
            <View style={{ backgroundColor: '#422006', borderRadius: 4, padding: '2 6' }}>
              <Text style={{ fontSize: 7, color: C.yellow }}>{warnCount} warn{warnCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Scores */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Overall', score: page.scores.overall },
          { label: 'SEO', score: page.scores.seo },
          { label: 'AEO', score: page.scores.aeo },
        ].map(({ label, score }) => (
          <View key={label} style={[S.pageDetailScoreChip, { backgroundColor: C.navyMid, borderRadius: 5, padding: '4 10' }]}>
            <Text style={[S.pageDetailScoreLabel]}>{label} </Text>
            <Text style={[S.pageDetailScoreVal, { color: scoreColor(score) }]}>{score}</Text>
          </View>
        ))}
      </View>

      {/* Score bars */}
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
        {[page.scores.overall, page.scores.seo, page.scores.aeo].map((s, i) => (
          <View key={i} style={{ flex: 1 }}>
            <View style={[S.scoreBarBg, { marginTop: 0 }]}>
              <View style={[S.scoreBarFill, { width: `${s}%`, backgroundColor: scoreColor(s) }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Failing checks only (space-efficient) */}
      {(['meta', 'content', 'technical', 'aeo'] as const).map(section => {
        const failing = page[section].filter(c => c.status !== 'pass')
        if (failing.length === 0) return null
        return (
          <View key={section} style={S.checkSection}>
            <Text style={S.checkSectionTitle}>{section}</Text>
            {failing.map((c, idx) => (
              <View key={idx}>
                <View style={S.checkItem}>
                  <View style={[S.checkDot, c.status === 'warning' ? S.checkDotWarn : S.checkDotFail]} />
                  <Text style={S.checkTag}>{c.tag}</Text>
                  <Text style={S.checkFound}>{truncate(c.found, 70)}</Text>
                </View>
                {c.recommendation && (
                  <Text style={S.checkRec}>↳ {truncate(c.recommendation, 100)}</Text>
                )}
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

function PageDetailPages({ pages }: { pages: PageAnalysis[] }) {
  return (
    <>
      {pages.map((page, i) => (
        <Page key={page.url} size="A4" style={S.page}>
          <PageHeader domain={new URL(page.url).hostname} />
          <View style={S.pageContent}>
            {i === 0 && (
              <SectionHeader title="Per-Page Analysis" subtitle="Detailed checks for each crawled page" />
            )}
            <PageDetailCard page={page} />
          </View>
          <PageFooter pageNum={`${5 + i}`} total="—" />
        </Page>
      ))}
    </>
  )
}

// ─── Main Document ────────────────────────────────────────────────────────────

function ReportDocument({ analysis }: { analysis: SiteAnalysis }) {
  const hasIssues =
    analysis.siteWideIssues.critical.length +
    analysis.siteWideIssues.warnings.length +
    analysis.siteWideIssues.opportunities.length > 0

  return (
    <Document
      title={`SEO & AEO Report — ${analysis.domain}`}
      author="SEO & AEO Analyzer"
      subject="Site Analysis Report"
      keywords="SEO, AEO, analysis, report"
    >
      <CoverPage analysis={analysis} />
      <ScoresPage analysis={analysis} />
      {hasIssues && <IssuesPage analysis={analysis} />}
      {analysis.pages.length > 0 && (
        <>
          <PageSummaryTable analysis={analysis} />
          <PageDetailPages pages={analysis.pages} />
        </>
      )}
    </Document>
  )
}

// ─── Export Function ──────────────────────────────────────────────────────────

export async function downloadReport(analysis: SiteAnalysis) {
  const blob = await pdf(<ReportDocument analysis={analysis} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `seo-aeo-report-${analysis.domain.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
