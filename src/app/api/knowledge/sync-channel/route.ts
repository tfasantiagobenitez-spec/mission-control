/**
 * Knowledge Base Channel Sync Endpoint
 * POST /api/knowledge/sync-channel
 * Body: { channel: string, maxVideos?: number, chatId?: number }
 *
 * This endpoint runs the long sync operation outside the Telegram webhook timeout.
 * The webhook fires & forgets this endpoint, which then sends results via Telegram.
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncYouTubeChannel } from '@/lib/knowledge/youtube-channel'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — enough for large channel syncs

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendTelegram(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  })
}

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  return auth.replace('Bearer ', '').trim() === process.env.INTERNAL_API_TOKEN
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { channel, maxVideos = 20, chatId } = await req.json()

  if (!channel) {
    return NextResponse.json({ error: 'channel is required' }, { status: 400 })
  }

  // Respond immediately so the caller doesn't timeout waiting
  // The sync runs and reports back via Telegram
  const syncPromise = (async () => {
    try {
      const result = await syncYouTubeChannel(channel, maxVideos)
      if (chatId) {
        await sendTelegram(chatId,
          `✅ *Sync completado: ${result.channelName}*\n` +
          `📥 Ingestados: ${result.ingested} videos\n` +
          `⏭️ Ya existían: ${result.skipped}\n` +
          `❌ Errores: ${result.errors.length}`
        )
      }
    } catch (err: any) {
      if (chatId) {
        await sendTelegram(chatId, `❌ Error sincronizando ${channel}: ${err.message}`)
      }
    }
  })()

  // Don't await — fire and forget, return immediately
  syncPromise.catch(console.error)

  return NextResponse.json({ ok: true, message: `Syncing ${channel} in background...` })
}
