import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)
const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY!
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql'

async function firefliesQuery(query: string, variables?: Record<string, any>) {
    const res = await fetch(FIREFLIES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIREFLIES_API_KEY}`
        },
        body: JSON.stringify({ query, variables })
    })
    if (!res.ok) throw new Error(`Fireflies API error: ${res.status} ${await res.text()}`)
    const json = await res.json()
    if (json.errors) throw new Error(`Fireflies GraphQL error: ${JSON.stringify(json.errors)}`)
    return json.data
}

interface FirefliesTranscript {
    id: string
    title: string
    date: number
    duration: number
    organizer_email: string
    meeting_attendees: { displayName: string | null; email: string }[]
    summary: {
        short_summary: string | null
        action_items: string | null
        keywords: string[] | null
    } | null
}

/**
 * Parse action items block returned by Fireflies.
 * Format:
 *   **Person Name**
 *   Do something (00:00)
 *   Do another thing (00:00)
 *
 *   **Another Person**
 *   ...
 */
function parseActionItems(raw: string): { person: string; item: string }[] {
    const results: { person: string; item: string }[] = []
    let currentPerson = ''
    for (const line of raw.split('\n')) {
        const personMatch = line.match(/^\*\*(.+?)\*\*/)
        if (personMatch) {
            currentPerson = personMatch[1].trim()
            continue
        }
        const cleaned = line.replace(/\(\d{2}:\d{2}(?::\d{2})?\)/g, '').trim()
        if (cleaned && currentPerson) {
            results.push({ person: currentPerson, item: cleaned })
        }
    }
    return results
}

export async function syncContactsFromFireflies() {
    console.log('[CRM Fireflies] Starting sync...')

    // Fetch last year of transcripts (max 50 per call)
    const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const data = await firefliesQuery(`
        query GetTranscripts($fromDate: String) {
            transcripts(fromDate: $fromDate, limit: 50) {
                id
                title
                date
                duration
                organizer_email
                meeting_attendees { displayName email }
                summary {
                    short_summary
                    action_items
                    keywords
                }
            }
        }
    `, { fromDate })

    const transcripts: FirefliesTranscript[] = data?.transcripts ?? []
    console.log(`[CRM Fireflies] Processing ${transcripts.length} meetings...`)

    for (const meeting of transcripts) {
        const meetingDate = new Date(meeting.date).toISOString()
        const attendeeEmails = (meeting.meeting_attendees || [])
            .map(a => a.email?.toLowerCase().trim())
            .filter(Boolean)

        // Parse action items and group by person name
        const actionItems = meeting.summary?.action_items
            ? parseActionItems(meeting.summary.action_items)
            : []

        for (const attendeeEmail of attendeeEmails) {
            // Skip self
            if (attendeeEmail.includes('sbenitez@areccoia.com')) continue

            const attendee = meeting.meeting_attendees.find(
                a => a.email?.toLowerCase().trim() === attendeeEmail
            )

            // Upsert contact
            const { data: contact, error: upsertError } = await supabase
                .from('crm_contacts')
                .upsert({
                    email: attendeeEmail,
                    full_name: attendee?.displayName || attendeeEmail.split('@')[0],
                    last_interaction_at: meetingDate,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'email' })
                .select()
                .single()

            if (upsertError || !contact) {
                console.error('[CRM Fireflies] Error upserting contact:', attendeeEmail, upsertError)
                continue
            }

            // Log interaction (the meeting itself)
            await supabase
                .from('crm_interactions')
                .upsert({
                    contact_id: contact.id,
                    type: 'meeting',
                    summary: meeting.title || meeting.summary?.short_summary || 'Meeting',
                    external_id: `fireflies-${meeting.id}-${attendeeEmail}`,
                    date: meetingDate
                }, { onConflict: 'external_id' })

            // Insert action items for this attendee as reminders
            // Match by searching for the attendee display name in the parsed action items
            const contactName = attendee?.displayName || attendeeEmail.split('@')[0]
            const nameWords = contactName.toLowerCase().split(' ')

            const relevantItems = actionItems.filter(ai => {
                const personLower = ai.person.toLowerCase()
                return nameWords.some(word => word.length > 2 && personLower.includes(word))
            })

            for (const ai of relevantItems) {
                await supabase
                    .from('crm_reminders')
                    .upsert({
                        contact_id: contact.id,
                        text: ai.item,
                        source: 'fireflies',
                        external_id: `fireflies-action-${meeting.id}-${attendeeEmail}-${ai.item.slice(0, 32)}`,
                        status: 'pending',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'external_id' })
            }
        }
    }

    console.log('[CRM Fireflies] Sync completed.')
}
