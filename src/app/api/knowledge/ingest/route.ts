/**
 * Knowledge Base Ingest Endpoint
 * POST /api/knowledge/ingest
 * Body: { url?: string, text?: string, type?: string, title?: string }
 *
 * Also handles YouTube channel sync:
 * POST /api/knowledge/ingest  { channel: '@AIDailyBrief', maxVideos?: 20 }
 */

import { NextRequest, NextResponse } from 'next/server'
import { ingestSource, detectSourceType } from '@/lib/knowledge/ingest'
import { syncYouTubeChannel } from '@/lib/knowledge/youtube-channel'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  return auth.replace('Bearer ', '').trim() === process.env.INTERNAL_API_TOKEN
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // ── Channel sync mode ──
    if (body.channel) {
      const maxVideos = body.maxVideos ?? 20
      const result = await syncYouTubeChannel(body.channel, maxVideos)
      return NextResponse.json({ ok: true, mode: 'channel_sync', ...result })
    }

    // ── Single source ingest ──
    const { url, text, type, title } = body

    if (!url && !text) {
      return NextResponse.json({ error: 'Provide url or text' }, { status: 400 })
    }

    const sourceInput = url || `text_${Date.now()}`
    const sourceType = type || (url ? detectSourceType(url) : 'text')

    const result = await ingestSource(sourceInput, sourceType, text)

    return NextResponse.json({
      ok: true,
      mode: result.alreadyExists ? 'already_exists' : 'ingested',
      ...result
    })
  } catch (err: any) {
    console.error('[knowledge/ingest] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Return list of ingested sources from Supabase
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, count } = await supabase
    .from('kb_sources')
    .select('id, url, type, title, chunk_count, summary, ingested_at', { count: 'exact' })
    .order('ingested_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ ok: true, total: count, sources: data })
}
