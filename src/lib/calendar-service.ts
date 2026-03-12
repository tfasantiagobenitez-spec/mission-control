import { createClient } from '@supabase/supabase-js'
import { refreshGoogleToken } from '@/lib/gmail'

export async function fetchGoogleCalendarEvents(limit: number = 5) {
    const targetEmail = 'sbenitez@areccoia.com'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        let { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle()

        if (!tokenData) {
            const { data: allTokens } = await supabase.from('google_tokens').select('*').limit(1)
            if (allTokens && allTokens.length > 0) {
                tokenData = allTokens[0]
            }
        }

        if (!tokenData) return []

        let accessToken = tokenData.access_token

        // Check if expired (with 1 min buffer)
        if (tokenData.expires_at < Date.now() + 60000 && tokenData.refresh_token) {
            const newTokens = await refreshGoogleToken(tokenData.refresh_token)
            accessToken = newTokens.access_token

            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expires_at: Date.now() + (newTokens.expires_in * 1000),
                updated_at: new Date().toISOString()
            }).eq('email', targetEmail)
        }

        // Fetch events from now going forward
        const timeMin = new Date().toISOString()
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${limit}&singleEvents=true&orderBy=startTime`

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!res.ok) {
            throw new Error(`Google Calendar API Error: ${await res.text()}`)
        }

        const data = await res.json()

        console.log(`[Calendar] Fetched from ${timeMin}, found ${data.items ? data.items.length : 0} items for ${targetEmail}`)

        return (data.items || []).map((item: any) => {
            const isAllDay = !item.start.dateTime
            const start = item.start.dateTime || item.start.date
            const end = item.end.dateTime || item.end.date
            const startTime = isAllDay
                ? 'Todo el día'
                : new Date(start).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })
            return {
                title: item.summary,
                description: item.description,
                start: start,
                end: end,
                startTime: startTime,
                isAllDay: isAllDay,
                location: item.location
            }
        })

    } catch (error) {
        console.error("Error fetching google calendar events:", error)
        return []
    }
}
