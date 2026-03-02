import type { CheckItem } from '@/types/analysis'

function scoreChecks(checks: CheckItem[]): number {
  if (checks.length === 0) return 0
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const earned = checks.reduce((sum, c) => {
    const points = c.status === 'pass' ? 1 : c.status === 'warning' ? 0.5 : 0
    return sum + points * c.weight
  }, 0)
  return totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100)
}

export function calculateScores(
  meta: CheckItem[],
  content: CheckItem[],
  technical: CheckItem[],
  aeo: CheckItem[]
): { overall: number; seo: number; aeo: number } {
  const metaScore = scoreChecks(meta)
  const contentScore = scoreChecks(content)
  const technicalScore = scoreChecks(technical)
  const aeoScore = scoreChecks(aeo)

  // SEO = meta(25%) + content(35%) + technical(40%)
  const seoScore = Math.round(metaScore * 0.25 + contentScore * 0.35 + technicalScore * 0.40)

  // Overall = SEO(60%) + AEO(40%)
  const overall = Math.round(seoScore * 0.60 + aeoScore * 0.40)

  return { overall, seo: seoScore, aeo: aeoScore }
}
