import { describe, it, expect } from 'vitest'
import { calculateScores } from '@/lib/scoring'
import type { CheckItem } from '@/types/analysis'

function makeChecks(statuses: Array<'pass' | 'warning' | 'fail'>): CheckItem[] {
  return statuses.map((status, i) => ({
    tag: `check-${i}`,
    status,
    found: '',
    recommendation: null,
    weight: 1,
  }))
}

describe('calculateScores', () => {
  it('returns 100 overall when all checks pass', () => {
    const passes = makeChecks(['pass', 'pass', 'pass'])
    const { overall, seo, aeo } = calculateScores(passes, passes, passes, passes)
    expect(overall).toBe(100)
    expect(seo).toBe(100)
    expect(aeo).toBe(100)
  })

  it('returns 0 overall when all checks fail', () => {
    const fails = makeChecks(['fail', 'fail', 'fail'])
    const { overall, seo, aeo } = calculateScores(fails, fails, fails, fails)
    expect(overall).toBe(0)
    expect(seo).toBe(0)
    expect(aeo).toBe(0)
  })

  it('returns 50 when all checks are warnings', () => {
    const warnings = makeChecks(['warning', 'warning'])
    const { seo } = calculateScores(warnings, warnings, warnings, warnings)
    expect(seo).toBe(50)
  })

  it('SEO score uses meta(25%) + content(35%) + technical(40%) weighting', () => {
    const allPass = makeChecks(['pass', 'pass'])
    const allFail = makeChecks(['fail', 'fail'])
    // Only technical passes → SEO = 0*0.25 + 0*0.35 + 100*0.40 = 40
    const { seo } = calculateScores(allFail, allFail, allPass, allFail)
    expect(seo).toBe(40)
  })

  it('Overall uses SEO(60%) + AEO(40%) weighting', () => {
    const allPass = makeChecks(['pass', 'pass'])
    const allFail = makeChecks(['fail', 'fail'])
    // SEO=100, AEO=0 → overall = 100*0.6 + 0*0.4 = 60
    const { overall } = calculateScores(allPass, allPass, allPass, allFail)
    expect(overall).toBe(60)
  })

  it('handles empty check arrays gracefully', () => {
    const { overall, seo, aeo } = calculateScores([], [], [], [])
    expect(overall).toBe(0)
    expect(seo).toBe(0)
    expect(aeo).toBe(0)
  })

  it('respects weight differences between checks', () => {
    const checks: CheckItem[] = [
      { tag: 'heavy', status: 'pass', found: '', recommendation: null, weight: 0.8 },
      { tag: 'light', status: 'fail', found: '', recommendation: null, weight: 0.2 },
    ]
    // aeo score = (0.8 pass + 0.2 fail) / 1.0 = 0.8 = 80
    const { aeo } = calculateScores([], [], [], checks)
    expect(aeo).toBe(80)
  })

  it('scores are always integers (rounded)', () => {
    const mixed = makeChecks(['pass', 'warning', 'fail'])
    const { overall, seo, aeo } = calculateScores(mixed, mixed, mixed, mixed)
    expect(Number.isInteger(overall)).toBe(true)
    expect(Number.isInteger(seo)).toBe(true)
    expect(Number.isInteger(aeo)).toBe(true)
  })
})
