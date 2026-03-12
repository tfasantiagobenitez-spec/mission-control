import { createClient } from '@supabase/supabase-js'
import { listGmailMessages, getGmailMessage, refreshGoogleToken } from '@/lib/gmail'

const targetEmail = 'sbenitez@areccoia.com'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function syncContactsFromGmail() {
    console.log('[CRM] Starting Gmail contact sync...')

    try {
        const { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle()

        if (!tokenData) {
            console.error('[CRM] No google tokens found for', targetEmail)
            return
        }

        let accessToken = tokenData.access_token
        if (tokenData.expires_at < Date.now() + 60000 && tokenData.refresh_token) {
            const newTokens = await refreshGoogleToken(tokenData.refresh_token)
            accessToken = newTokens.access_token
            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expires_at: Date.now() + (newTokens.expires_in * 1000),
                updated_at: new Date().toISOString()
            }).eq('email', targetEmail)
        }

        // Fetch messages from the last year
        // For efficiency in this first pass, we'll fetch a batch of recent ones
        const messages = await listGmailMessages(accessToken, 100)

        for (const msgSummary of messages) {
            const msg = await getGmailMessage(accessToken, msgSummary.id)
            if (!msg) continue

            // Basic extraction: From Header
            // Example: "John Doe <john@example.com>"
            const fromHeader = msg.from
            const emailMatch = fromHeader.match(/<(.+?)>/) || [null, fromHeader]
            const email = (emailMatch[1] || fromHeader).toLowerCase().trim()
            const name = fromHeader.split('<')[0].replace(/"/g, '').trim()

            // Skip self and automated/noise senders (basic filter)
            if (email.includes(targetEmail) || email.includes('noreply') || email.includes('newsletter')) {
                continue
            }

            // Upsert contact
            const { data: contact, error: upsertError } = await supabase
                .from('crm_contacts')
                .upsert({
                    email,
                    full_name: name || email.split('@')[0],
                    last_interaction_at: new Date(msg.date).toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'email' })
                .select()
                .single()

            if (upsertError) {
                console.error('[CRM] Error upserting contact:', email, upsertError)
                continue
            }

            // Log interaction
            await supabase
                .from('crm_interactions')
                .upsert({
                    contact_id: contact.id,
                    type: 'email',
                    summary: msg.subject,
                    external_id: msg.id,
                    date: new Date(msg.date).toISOString()
                }, { onConflict: 'external_id' })
        }

        console.log('[CRM] Gmail sync completed.')

        // --- Calendar Sync ---
        console.log('[CRM] Starting Calendar sync...')
        const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
        const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true`

        const calRes = await fetch(calendarUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (calRes.ok) {
            const calData = await calRes.json()
            for (const event of (calData.items || [])) {
                if (!event.attendees) continue

                for (const attendee of event.attendees) {
                    const email = attendee.email?.toLowerCase().trim()
                    if (!email || email === targetEmail || email.includes('resource.calendar')) continue

                    // Upsert contact
                    const { data: contact } = await supabase
                        .from('crm_contacts')
                        .upsert({
                            email,
                            full_name: attendee.displayName || email.split('@')[0],
                            last_interaction_at: new Date(event.start.dateTime || event.start.date).toISOString(),
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'email' })
                        .select()
                        .single()

                    if (contact) {
                        await supabase
                            .from('crm_interactions')
                            .upsert({
                                contact_id: contact.id,
                                type: 'calendar',
                                summary: event.summary,
                                external_id: event.id,
                                date: new Date(event.start.dateTime || event.start.date).toISOString()
                            }, { onConflict: 'external_id' })
                    }
                }
            }
        }
        console.log('[CRM] Calendar sync completed.')

    } catch (error) {
        console.error('[CRM] Sync error:', error)
    }
}
