/**
 * Knowledge Base Channel Sync Endpoint
 * POST /api/knowledge/sync-channel
 * Body: { channel: string, maxVideos?: number, chatId?: number }
 *
 * Uses Next.js `after()` to run the sync AFTER the HTTP response is sent.
 * This keeps the serverless function alive past the response without blocking the caller.
 */

import { NextRequest, NextResponse, after } from 'next/server'
import { syncYouTubeChannel } from '@/lib/knowledge/youtube-channel'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes (Vercel Pro) — use 60 for Hobby

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendTelegram(chatId: number, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    })
  } catch (e) {
    console.error('[sync-channel] Telegram send failed:', e)
  }
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

  console.log(`[sync-channel] Starting sync for ${channel}, maxVideos=${maxVideos}, chatId=${chatId}`)

  // `after()` runs the callback AFTER the response is sent.
  // Vercel keeps the serverless function alive until the callback completes.
  after(async () => {
    console.log(`[sync-channel] after() running for ${channel}`)
    try {
      const result = await syncYouTubeChannel(channel, maxVideos)
      console.log(`[sync-channel] Sync done: ingested=${result.ingested}, skipped=${result.skipped}`)
      if (chatId) {
        await sendTelegram(chatId,
          `✅ *Sync completado: ${result.channelName}*\n` +
          `📥 Ingestados: ${result.ingested} videos\n` +
          `⏭️ Ya existían: ${result.skipped}\n` +
          `❌ Errores: ${result.errors.length}`
        )
      }
    } catch (err: any) {
      console.error(`[sync-channel] Error:`, err.message)
      if (chatId) {
        await sendTelegram(chatId, `❌ Error sincronizando *${channel}*: ${err.message}`)
      }
    }
  })

  return NextResponse.json({
    ok: true,
    message: `Syncing ${channel} in background... You'll receive a Telegram message when done.`
  })
}
