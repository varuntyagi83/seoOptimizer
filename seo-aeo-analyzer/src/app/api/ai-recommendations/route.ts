import { NextRequest, NextResponse } from 'next/server'
import { generateRecommendations } from '@/lib/openai'
import type { SiteAnalysis } from '@/types/analysis'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  let analysis: SiteAnalysis

  try {
    analysis = await request.json() as SiteAnalysis
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!analysis?.domain || !analysis?.scores) {
    return NextResponse.json({ error: 'Invalid SiteAnalysis payload' }, { status: 400 })
  }

  try {
    const recommendations = await generateRecommendations(analysis)
    return NextResponse.json(recommendations)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
