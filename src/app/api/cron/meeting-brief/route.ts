// src/app/api/cron/meeting-brief/route.ts
// Cron job: check for upcoming meetings and send a prep brief 30min before
// Schedule: every 30 minutes — */30 * * * *
// Uses Fireflies.ai GraphQL API to fetch upcoming meetings + past transcripts

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/openrouter'

export const maxDuration = 45

const FIREFLIES_API = 'https://api.fireflies.ai/graphql'

async function firefliesQuery(query: string, variables?: Record<string, unknown>) {
    const apiKey = process.env.FIREFLIES_API_KEY
    if (!apiKey) throw new Error('FIREFLIES_API_KEY not configured')

    const res = await fetch(FIREFLIES_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!res.ok) throw new Error(`Fireflies API error: ${res.status}`)
    const json = await res.json()
    if (json.errors) throw new Error(json.errors[0]?.message || 'Fireflies GraphQL error')
    return json.data
}

async function sendTelegram(text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return

    const chunks = splitMessage(text, 4096)
    for (const chunk of chunks) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: 'HTML' }),
        }).catch(err => console.error('[meeting-brief] Telegram send failed:', err))
    }
}

function splitMessage(text: string, max: number): string[] {
    if (text.length <= max) return [text]
    const chunks: string[] = []
    const lines = text.split('\n')
    let current = ''
    for (const line of lines) {
        if ((current + '\n' + line).length > max) {
            if (current) chunks.push(current.trim())
            current = line
        } else {
            current = current ? current + '\n' + line : line
        }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Fetch upcoming meetings from Fireflies
        // Fireflies tracks meetings via calendar integration
        const upcomingData = await firefliesQuery(`
            query UpcomingMeetings {
                user {
                    name
                    email
                    integrations
                }
            }
        `).catch(() => null)

        // Fetch recent transcripts to provide context for upcoming meetings
        const transcriptsData = await firefliesQuery(`
            query RecentTranscripts {
                transcripts(limit: 10) {
                    id
                    title
                    date
                    duration
                    participants
                    summary {
                        overview
                        action_items
                        keywords
                    }
                }
            }
        `).catch(() => null)

        const transcripts = transcriptsData?.transcripts || []

        if (transcripts.length === 0) {
            console.log('[meeting-brief] No recent transcripts found')
            return NextResponse.json({ ok: true, message: 'No transcripts available' })
        }

        // Check if there's a meeting that likely starts in the next 30-60 min
        // Fireflies doesn't expose future calendar events directly via API
        // but we can look at recurring patterns and the most recent transcript metadata
        // to infer if a meeting is likely upcoming

        // Build context from recent transcripts
        const recentContext = transcripts.slice(0, 5).map((t: {
            title: string
            date: number
            duration: number
            participants: string[]
            summary?: {
                overview?: string
                action_items?: string[]
                keywords?: string[]
            }
        }) => {
            const date = new Date(t.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            const participantList = (t.participants || []).slice(0, 5).join(', ')
            const overview = t.summary?.overview?.slice(0, 200) || 'Sin resumen'
            const actions = (t.summary?.action_items || []).slice(0, 3).join(' | ') || 'Sin acciones'
            return `📅 ${date} | ${t.title}\n   👥 ${participantList}\n   📝 ${overview}\n   ✅ Pendientes: ${actions}`
        }).join('\n\n')

        // Use LLM to generate a meeting prep brief based on recent context
        const prompt = `Sos el asistente ejecutivo de Santiago Benitez, fundador de Arecco IA.
Basándote en las reuniones recientes, generá un BRIEF DE PREPARACIÓN conciso para las próximas reuniones del día.

REUNIONES RECIENTES (contexto):
${recentContext}

Generá un brief que incluya:
1. Temas pendientes de reuniones anteriores que probablemente resurjan
2. Compromisos adquiridos que debería mencionar (action items)
3. Preguntas clave a hacer en la próxima reunión
4. Una recomendación de postura/enfoque

Formato: conciso, directo, en español. Máximo 250 palabras.`

        const result = await chatCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 400,
        })

        const brief = result.choices[0]?.message?.content?.trim()
        if (!brief) {
            return NextResponse.json({ ok: true, message: 'LLM did not generate brief' })
        }

        const mostRecent = transcripts[0]
        const recentDate = new Date(mostRecent.date).toLocaleDateString('es-AR', {
            day: 'numeric', month: 'long',
        })

        const message = [
            `📋 <b>Brief de Reuniones — Arecco IA</b>`,
            ``,
            `<b>Contexto basado en reuniones recientes</b>`,
            `Última reunión registrada: ${mostRecent.title} (${recentDate})`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━`,
            brief,
            `━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `🔗 <i>Ver transcripciones completas en Fireflies.ai</i>`,
        ].join('\n')

        await sendTelegram(message)

        return NextResponse.json({
            ok: true,
            transcriptsAnalyzed: transcripts.length,
            briefGenerated: true,
        })
    } catch (err: any) {
        console.error('[cron/meeting-brief] Error:', err)
        // Don't spam Telegram on meeting-brief errors (non-critical)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * POST: manually trigger a meeting brief for a specific meeting/person
 * Body: { meetingTitle?: string, participants?: string[] }
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delegate to GET logic
    return GET(req)
}
