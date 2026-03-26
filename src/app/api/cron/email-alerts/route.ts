// src/app/api/cron/email-alerts/route.ts
// Cron job: check for important emails and notify via Telegram
// Schedule: 3 times/day — 11:00, 15:00, 19:00 UTC (08:00, 12:00, 16:00 ART)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listGmailMessages, getGmailMessage, refreshGoogleToken } from '@/lib/gmail'
import { chatCompletion } from '@/lib/openrouter'

export const maxDuration = 45

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function sendTelegram(text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 4096),
            parse_mode: 'HTML',
        }),
    }).catch(err => console.error('[email-alerts] Telegram error:', err))
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

        // Get Google token
        let { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .ilike('email', 'sbenitez@areccoia.com')
            .maybeSingle()

        if (!tokenData) {
            const { data: fallback } = await supabase.from('google_tokens').select('*').limit(1)
            tokenData = fallback?.[0] ?? null
        }
        if (!tokenData) return NextResponse.json({ ok: true, message: 'No Google token' })

        // Refresh token if needed
        let accessToken = tokenData.access_token
        if (tokenData.expires_at < Date.now() + 60000 && tokenData.refresh_token) {
            const refreshed = await refreshGoogleToken(tokenData.refresh_token)
            accessToken = refreshed.access_token
            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expires_at: Date.now() + refreshed.expires_in * 1000,
                updated_at: new Date().toISOString(),
            }).eq('email', tokenData.email)
        }

        // Fetch emails from last 4 hours
        const since = Math.floor((Date.now() - 4 * 60 * 60 * 1000) / 1000)
        const query = `after:${since} -from:me -category:promotions -category:social`
        const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(query)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!res.ok) return NextResponse.json({ ok: true, message: 'Gmail fetch failed' })
        const data = await res.json()
        const messages = data.messages || []

        if (messages.length === 0) {
            return NextResponse.json({ ok: true, emailsFound: 0 })
        }

        // Fetch full content of up to 10 emails
        const full = await Promise.all(
            messages.slice(0, 10).map((m: any) =>
                getGmailMessage(accessToken, m.id).catch(() => null)
            )
        )
        const valid = full.filter(Boolean)
        if (valid.length === 0) return NextResponse.json({ ok: true, emailsFound: 0 })

        // Ask LLM to identify important ones
        const emailList = valid.map((e: any, i: number) =>
            `[${i + 1}] De: ${e.from}\nAsunto: ${e.subject}\nContenido: ${e.snippet?.slice(0, 200)}`
        ).join('\n\n')

        const result = await chatCompletion({
            messages: [{
                role: 'user',
                content: `Sos el asistente de Santiago Benitez, CFO de Arecco IA.
Analizá estos emails recibidos en las últimas 4 horas e identificá los que requieren atención inmediata o son importantes (clientes, inversores, socios, reuniones, pagos, urgencias).

EMAILS:
${emailList}

Respondé SOLO con JSON array. Formato:
[{"index": 1, "priority": "alta|media", "reason": "por qué es importante (1 línea)", "action": "qué hacer (1 línea)"}]

Si ninguno es importante, respondé: []`
            }],
            temperature: 0,
            max_tokens: 500,
        })

        const raw = result.choices[0]?.message?.content?.trim() || '[]'
        const json = raw.replace(/```json\n?|\n?```/g, '').trim()
        const important: Array<{ index: number; priority: string; reason: string; action: string }> = JSON.parse(json)

        if (important.length === 0) {
            return NextResponse.json({ ok: true, emailsFound: valid.length, important: 0 })
        }

        // Build Telegram message
        const hora = new Date().toLocaleTimeString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit', minute: '2-digit',
        })

        const lines = [
            `📧 <b>Emails importantes — ${hora}</b>`,
            ``,
        ]

        for (const item of important) {
            const email = valid[item.index - 1] as any
            if (!email) continue
            const priorityEmoji = item.priority === 'alta' ? '🔴' : '🟡'
            lines.push(`${priorityEmoji} <b>${email.subject}</b>`)
            lines.push(`   👤 ${email.from.split('<')[0].trim()}`)
            lines.push(`   💡 ${item.reason}`)
            lines.push(`   ➡️ ${item.action}`)
            lines.push(``)
        }

        await sendTelegram(lines.join('\n'))

        return NextResponse.json({ ok: true, emailsFound: valid.length, important: important.length })

    } catch (err: any) {
        console.error('[cron/email-alerts] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
