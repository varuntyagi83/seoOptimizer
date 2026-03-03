import { NextRequest, NextResponse } from 'next/server'
import { getRecentAnalysisByUrl } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ analysis: null }, { status: 400 })
  }

  try {
    const analysis = await getRecentAnalysisByUrl(url)
    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[API] analyses/recent error:', err)
    return NextResponse.json({ analysis: null })
  }
}
