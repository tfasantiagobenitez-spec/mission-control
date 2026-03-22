// src/app/api/cron/meeting-brief/route.ts
// Cron job: send a prep brief 30-60min before upcoming Google Calendar meetings
// Schedule: every 30 minutes — */30 * * * *

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatCompletion } from '@/lib/openrouter'

export const maxDuration = 45

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const FIREFLIES_API = 'https://api.fireflies.ai/graphql'

// ── Google Calendar helpers ────────────────────────────────────────────────

async function getValidAccessToken(token: {
    access_token: string
    refresh_token: string | null
    expires_at: number
    email: string
}): Promise<string | null> {
    if (Date.now() < token.expires_at - 60_000) return token.access_token
    if (!token.refresh_token) return null

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: token.refresh_token,
            grant_type: 'refresh_token',
        }),
    })

    const data = await res.json()
    if (!data.access_token) return null

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    await supabase.from('google_tokens').update({
        access_token: data.access_token,
        expires_at: Date.now() + data.expires_in * 1000,
        updated_at: new Date().toISOString(),
    }).eq('email', token.email)

    return data.access_token
}

async function getUpcomingMeetings(accessToken: string): Promise<CalendarEvent[]> {
    // Window: next 30 to 75 minutes (catches events starting in that range)
    const timeMin = new Date(Date.now() + 25 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 75 * 60 * 1000).toISOString()

    const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '5',
    })

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) return []

    const data = await res.json()
    return (data.items || [])
        .filter((e: any) => e.status !== 'cancelled' && e.start?.dateTime)
        .map((e: any) => ({
            id: e.id,
            title: e.summary || '(Sin título)',
            description: e.description || '',
            start: e.start.dateTime,
            location: e.location || null,
            meetLink: e.hangoutLink || null,
            attendees: (e.attendees || [])
                .filter((a: any) => !a.self)
                .map((a: any) => ({ email: a.email, name: a.displayName || a.email })),
        }))
}

type CalendarEvent = {
    id: string
    title: string
    description: string
    start: string
    location: string | null
    meetLink: string | null
    attendees: { email: string; name: string }[]
}

// ── Fireflies helpers ──────────────────────────────────────────────────────

async function getFirefliesContext(attendeeEmails: string[]): Promise<string> {
    const apiKey = process.env.FIREFLIES_API_KEY
    if (!apiKey) return ''

    try {
        const res = await fetch(FIREFLIES_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query: `
                    query RecentTranscripts {
                        transcripts(limit: 15) {
                            id
                            title
                            date
                            participants
                            summary {
                                overview
                                action_items
                            }
                        }
                    }
                `,
            }),
        })

        if (!res.ok) return ''
        const json = await res.json()
        const transcripts = json.data?.transcripts || []

        // Filter transcripts that include at least one attendee
        const relevant = transcripts.filter((t: any) => {
            const participants = (t.participants || []).map((p: string) => p.toLowerCase())
            return attendeeEmails.some(email =>
                participants.some((p: string) => p.includes(email.toLowerCase()) || email.toLowerCase().includes(p))
            )
        })

        if (relevant.length === 0) {
            // No matching transcripts — return the 3 most recent for general context
            return transcripts.slice(0, 3).map((t: any) => {
                const date = new Date(t.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                return `• ${t.title} (${date})\n  ${t.summary?.overview?.slice(0, 150) || 'Sin resumen'}`
            }).join('\n')
        }

        return relevant.slice(0, 4).map((t: any) => {
            const date = new Date(t.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            const actions = (t.summary?.action_items || []).slice(0, 3).join(' | ') || 'Sin acciones pendientes'
            return [
                `📋 ${t.title} (${date})`,
                `   Resumen: ${t.summary?.overview?.slice(0, 200) || 'Sin resumen'}`,
                `   Pendientes: ${actions}`,
            ].join('\n')
        }).join('\n\n')
    } catch {
        return ''
    }
}

// ── Telegram ───────────────────────────────────────────────────────────────

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
    }).catch(err => console.error('[meeting-brief] Telegram send failed:', err))
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Load Google tokens from Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        const { data: googleAccounts } = await supabase.from('google_tokens').select('*')

        if (!googleAccounts || googleAccounts.length === 0) {
            return NextResponse.json({ ok: true, message: 'No Google accounts connected' })
        }

        // Collect upcoming meetings across all connected accounts
        const upcomingMeetings: CalendarEvent[] = []
        for (const account of googleAccounts) {
            const accessToken = await getValidAccessToken(account)
            if (!accessToken) continue
            const events = await getUpcomingMeetings(accessToken)
            upcomingMeetings.push(...events)
        }

        if (upcomingMeetings.length === 0) {
            console.log('[meeting-brief] No meetings in next 30-75 min window')
            return NextResponse.json({ ok: true, message: 'No upcoming meetings in window' })
        }

        // Generate a brief for each upcoming meeting
        for (const meeting of upcomingMeetings) {
            const startTime = new Date(meeting.start).toLocaleTimeString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                hour: '2-digit',
                minute: '2-digit',
            })

            const minutesUntil = Math.round((new Date(meeting.start).getTime() - Date.now()) / 60000)

            const attendeeEmails = meeting.attendees.map(a => a.email)
            const attendeeNames = meeting.attendees.map(a => a.name).join(', ') || 'Sin invitados externos'

            // Get Fireflies context for these attendees
            const firesContext = await getFirefliesContext(attendeeEmails)

            // Generate brief via LLM
            const prompt = `Sos el asistente ejecutivo de Santiago Benitez, CEO de Arecco IA.
Tiene una reunión en ${minutesUntil} minutos.

REUNIÓN:
- Título: ${meeting.title}
- Hora: ${startTime}
- Participantes: ${attendeeNames}
${meeting.description ? `- Descripción: ${meeting.description.slice(0, 300)}` : ''}
${meeting.location ? `- Ubicación: ${meeting.location}` : ''}
${meeting.meetLink ? `- Meet: ${meeting.meetLink}` : ''}

CONTEXTO DE REUNIONES ANTERIORES CON ESTOS CONTACTOS:
${firesContext || 'Sin historial previo con estos contactos.'}

Generá un BRIEF DE PREPARACIÓN con:
1. **Objetivo probable** de la reunión (1 línea)
2. **Puntos pendientes** de conversaciones anteriores que debería mencionar
3. **3 preguntas clave** para hacer
4. **Recomendación de postura** (1 línea: ej. "ir a cerrar", "escuchar más que hablar", etc.)

Formato: directo, en español, máximo 200 palabras. Sin relleno.`

            const result = await chatCompletion({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 350,
            })

            const brief = result.choices[0]?.message?.content?.trim()
            if (!brief) continue

            const message = [
                `🗓️ <b>Brief: ${meeting.title}</b>`,
                `⏰ En ${minutesUntil} minutos (${startTime})`,
                meeting.attendees.length > 0 ? `👥 ${attendeeNames}` : '',
                meeting.meetLink ? `🔗 <a href="${meeting.meetLink}">Unirse a Meet</a>` : '',
                ``,
                `━━━━━━━━━━━━━━━━━━━━━`,
                brief,
            ].filter(Boolean).join('\n')

            await sendTelegram(message)
        }

        return NextResponse.json({
            ok: true,
            meetingsFound: upcomingMeetings.length,
            titles: upcomingMeetings.map(m => m.title),
        })
    } catch (err: any) {
        console.error('[cron/meeting-brief] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
