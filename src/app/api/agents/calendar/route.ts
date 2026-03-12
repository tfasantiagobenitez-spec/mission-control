import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Refresh Google access token if expired
async function getValidAccessToken(token: {
    access_token: string
    refresh_token: string | null
    expires_at: number
    email: string
}): Promise<string | null> {
    if (Date.now() < token.expires_at - 60_000) {
        return token.access_token
    }

    if (!token.refresh_token) {
        console.warn(`No refresh_token for ${token.email}, need re-auth`)
        return null
    }

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
    await supabase
        .from('google_tokens')
        .update({
            access_token: data.access_token,
            expires_at: Date.now() + data.expires_in * 1000,
            updated_at: new Date().toISOString(),
        })
        .eq('email', token.email)

    return data.access_token
}

// Fetch Google Calendar events for one account
async function fetchGoogleCalendarEvents(
    accessToken: string,
    email: string,
    timeMin: string,
    timeMax: string
): Promise<any[]> {
    const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '200',
    })

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) {
        console.error(`Google Calendar API error for ${email}:`, res.status)
        return []
    }

    const data = await res.json()
    return (data.items || [])
        .filter((e: any) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
        .map((e: any) => ({
            id: `gcal_${e.id}`,
            title: e.summary || '(Sin título)',
            description: e.description || '',
            start: e.start.dateTime || `${e.start.date}T00:00:00`,
            end: e.end?.dateTime || `${e.end?.date}T23:59:59`,
            status: 'google',
            priority: 'normal',
            account: email,
            source: 'google',
            location: e.location || null,
            meetLink: e.hangoutLink || null,
        }))
}

export async function GET() {
    const clickupToken = process.env.CLICKUP_API_TOKEN
    const teamId = process.env.CLICKUP_TEAM_ID

    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const allEvents: any[] = []

    // ── 1. ClickUp tasks ──────────────────────────────────────────────
    if (clickupToken && teamId) {
        try {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
            const ninetyDaysFuture = Date.now() + 90 * 24 * 60 * 60 * 1000
            const url = `https://api.clickup.com/api/v2/team/${teamId}/task?subtasks=true&include_closed=true&limit=100&due_date_gt=${thirtyDaysAgo}&due_date_lt=${ninetyDaysFuture}`

            const res = await fetch(url, { headers: { Authorization: clickupToken } })
            if (res.ok) {
                const data = await res.json()
                const tasks = (data.tasks || [])
                    .filter((t: any) => t.due_date || t.start_date)
                    .map((t: any) => ({
                        id: t.id,
                        title: t.name,
                        description: t.description || '',
                        start: t.start_date ? new Date(parseInt(t.start_date)).toISOString() : null,
                        end: t.due_date ? new Date(parseInt(t.due_date)).toISOString() : null,
                        status: t.status?.status || 'todo',
                        priority: t.priority?.priority || 'normal',
                        account: t.list?.name || 'ClickUp',
                        source: 'clickup',
                    }))
                allEvents.push(...tasks)
            }
        } catch (e) {
            console.error('ClickUp fetch error:', e)
        }
    }

    // ── 2. Google Calendar (all connected accounts) ───────────────────
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
            const { data: googleAccounts } = await supabase
                .from('google_tokens')
                .select('*')

            if (googleAccounts && googleAccounts.length > 0) {
                await Promise.all(
                    googleAccounts.map(async (account) => {
                        const accessToken = await getValidAccessToken(account)
                        if (!accessToken) return
                        const events = await fetchGoogleCalendarEvents(
                            accessToken,
                            account.email,
                            timeMin,
                            timeMax
                        )
                        allEvents.push(...events)
                    })
                )
            }
        } catch (e) {
            console.error('Google Calendar fetch error:', e)
        }
    }

    // Sort all events by start date
    allEvents.sort((a, b) => {
        const dateA = new Date(a.start || a.end || 0).getTime()
        const dateB = new Date(b.start || b.end || 0).getTime()
        return dateA - dateB
    })

    return NextResponse.json({ success: true, events: allEvents })
}

export async function POST(request: Request) {
    const clickupToken = process.env.CLICKUP_API_TOKEN
    const listId = process.env.CLICKUP_LIST_ID

    if (!clickupToken || !listId) {
        return NextResponse.json({ error: 'ClickUp config missing' }, { status: 500 })
    }

    try {
        const body = await request.json()
        const { title, description, start, end, meetingType, guestEmail } = body

        let meetingInfo = ''
        if (meetingType === 'meet') {
            meetingInfo = '\n\n---\n### 🎥 Videoconferencia: Google Meet\nUnirse a la reunión: https://meet.google.com/new\n*(Se generará un enlace nuevo al abrir)*'
        } else if (meetingType === 'zoom') {
            meetingInfo = '\n\n---\n### 🎥 Videoconferencia: Zoom\nUnirse a la reunión: https://zoom.us/new\n*(Se generará un enlace nuevo al abrir)*'
        }

        const fullDescription = `${description || ''}${meetingInfo}${guestEmail ? `\n\n### 👥 Invitado\nEmail: ${guestEmail}` : ''}`
        const startTimestamp = start ? new Date(start).getTime() : undefined
        const endTimestamp = end ? new Date(end).getTime() : undefined

        const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            method: 'POST',
            headers: { Authorization: clickupToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: title,
                description: fullDescription,
                start_date: startTimestamp,
                due_date: endTimestamp,
                status: 'todo',
                priority: 3,
                notify_all: true,
            }),
        })

        if (!res.ok) throw new Error('Failed to create task in ClickUp')
        const data = await res.json()
        return NextResponse.json({ success: true, event: data })
    } catch (error) {
        console.error('Error creating calendar event:', error)
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }
}
