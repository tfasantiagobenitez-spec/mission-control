import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)
const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY!
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql'

// Names to match as "mine" — comma-separated, lowercase
const MY_NAME_VARIANTS = (process.env.MY_NAME_VARIANTS || 'santiago,santi,s.benitez,sbenitez')
  .split(',').map(n => n.trim().toLowerCase())

const MY_EMAIL = process.env.MY_EMAIL || 'sbenitez@areccoia.com'

async function firefliesQuery(query: string, variables?: Record<string, unknown>) {
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

interface FirefliesAttendee {
  displayName: string | null
  email: string
}

interface FirefliesTranscript {
  id: string
  title: string
  date: number
  duration: number
  organizer_email: string
  meeting_attendees: FirefliesAttendee[]
  summary: {
    short_summary: string | null
    action_items: string | null
    keywords: string[] | null
  } | null
}

interface ActionItem {
  person: string
  item: string
  owner: 'mine' | 'theirs'
}

/**
 * Parse Fireflies action items block.
 * Format: **Person Name** followed by items with optional timestamps.
 */
function parseActionItems(raw: string): ActionItem[] {
  const results: ActionItem[] = []
  let currentPerson = ''
  for (const line of raw.split('\n')) {
    const personMatch = line.match(/^\*\*(.+?)\*\*/)
    if (personMatch) {
      currentPerson = personMatch[1].trim()
      continue
    }
    const cleaned = line.replace(/\(\d{2}:\d{2}(?::\d{2})?\)/g, '').trim()
    if (cleaned && currentPerson) {
      const personLower = currentPerson.toLowerCase()
      const isMine = MY_NAME_VARIANTS.some(variant => personLower.includes(variant))
      results.push({ person: currentPerson, item: cleaned, owner: isMine ? 'mine' : 'theirs' })
    }
  }
  return results
}

/**
 * Get last processed meeting timestamp from DB.
 */
async function getLastProcessedDate(): Promise<Date> {
  const { data } = await supabase
    .from('crm_processed_meetings')
    .select('meeting_date')
    .order('meeting_date', { ascending: false })
    .limit(1)
    .single()

  if (data?.meeting_date) return new Date(data.meeting_date)
  // Default: last 30 days
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
}

/**
 * Fetch new (unprocessed) Fireflies meetings since last sync.
 */
export async function getNewMeetings(): Promise<FirefliesTranscript[]> {
  const since = await getLastProcessedDate()
  const fromDate = since.toISOString().split('T')[0]

  const data = await firefliesQuery(`
    query GetTranscripts($fromDate: String) {
      transcripts(fromDate: $fromDate, limit: 20) {
        id title date duration organizer_email
        meeting_attendees { displayName email }
        summary { short_summary action_items keywords }
      }
    }
  `, { fromDate })

  const transcripts: FirefliesTranscript[] = data?.transcripts ?? []

  // Filter out already-processed meetings
  const processedIds = new Set<string>()
  if (transcripts.length > 0) {
    const { data: processed } = await supabase
      .from('crm_processed_meetings')
      .select('fireflies_id')
      .in('fireflies_id', transcripts.map(t => t.id))
    processed?.forEach(p => processedIds.add(p.fireflies_id))
  }

  return transcripts.filter(t => !processedIds.has(t.id))
}

/**
 * Send Telegram message with inline approve/reject buttons for each "mine" action item.
 * Returns Telegram message_id for tracking.
 */
async function sendTelegramApprovalMessage(
  meeting: FirefliesTranscript,
  myItems: ActionItem[],
  reminderIds: string[]
): Promise<string | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) {
    console.warn('[Fireflies] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID')
    return null
  }

  // Build message text
  const attendees = meeting.meeting_attendees
    .filter(a => !a.email?.includes(MY_EMAIL.split('@')[1]) || a.email !== MY_EMAIL)
    .map(a => a.displayName || a.email)
    .join(', ')

  const date = new Date(meeting.date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
  const title = meeting.title || meeting.summary?.short_summary || 'Reunión sin título'

  let text = `📋 *Reunión: ${title}*\n`
  text += `📅 ${date} | 👥 ${attendees || 'Sin asistentes'}\n\n`
  text += `*Action items para aprobar (${myItems.length}):*\n`
  myItems.forEach((item, i) => {
    text += `\n${i + 1}. ${item.item}`
  })

  // Build inline keyboard: one row per item with Approve/Reject
  const inline_keyboard = myItems.map((item, i) => [
    {
      text: `✅ Aprobar: "${item.item.slice(0, 30)}${item.item.length > 30 ? '...' : ''}"`,
      callback_data: `approve:${reminderIds[i]}`
    },
    {
      text: `❌ Rechazar`,
      callback_data: `reject:${reminderIds[i]}`
    }
  ])

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    })
  })

  if (!res.ok) {
    console.error('[Fireflies] Telegram send failed:', await res.text())
    return null
  }

  const json = await res.json()
  return json.result?.message_id?.toString() ?? null
}

export interface ProcessMeetingResult {
  meetingId: string
  title: string
  contactsUpserted: number
  myItems: number
  theirItems: number
  telegramSent: boolean
}

/**
 * Process a single new meeting: upsert contacts, log interactions, create reminders.
 * Sends Telegram approval for "mine" items. "Their" items go to waiting_on immediately.
 */
export async function processMeeting(meeting: FirefliesTranscript): Promise<ProcessMeetingResult> {
  const meetingDate = new Date(meeting.date).toISOString()
  const attendees = (meeting.meeting_attendees || []).filter(
    a => a.email && !a.email.toLowerCase().includes(MY_EMAIL)
  )
  const actionItems = meeting.summary?.action_items
    ? parseActionItems(meeting.summary.action_items)
    : []

  const myItems = actionItems.filter(ai => ai.owner === 'mine')
  const theirItems = actionItems.filter(ai => ai.owner === 'theirs')

  let contactsUpserted = 0
  const myReminderIds: string[] = []

  for (const attendee of attendees) {
    const email = attendee.email.toLowerCase().trim()

    const { data: contact } = await supabase
      .from('crm_contacts')
      .upsert({
        email,
        full_name: attendee.displayName || email.split('@')[0],
        last_interaction_at: meetingDate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single()

    if (!contact) continue
    contactsUpserted++

    // Log meeting interaction
    await supabase
      .from('crm_interactions')
      .upsert({
        contact_id: contact.id,
        type: 'meeting',
        summary: meeting.title || meeting.summary?.short_summary || 'Reunión',
        external_id: `ff-${meeting.id}-${email}`,
        date: meetingDate
      }, { onConflict: 'external_id' })

    // "Their" action items → immediately 'waiting_on'
    for (const ai of theirItems) {
      const personLower = ai.person.toLowerCase()
      const nameWords = (attendee.displayName || email).toLowerCase().split(' ')
      const isThisContact = nameWords.some(w => w.length > 2 && personLower.includes(w))
      if (!isThisContact) continue

      await supabase
        .from('crm_reminders')
        .upsert({
          contact_id: contact.id,
          text: ai.item,
          source: 'fireflies',
          owner: 'theirs',
          meeting_id: meeting.id,
          status: 'waiting_on',
          external_id: `ff-their-${meeting.id}-${email}-${ai.item.slice(0, 32)}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'external_id' })
    }
  }

  // "My" action items → pending_approval (linked to first non-self contact)
  const firstContact = attendees[0]
  if (firstContact && myItems.length > 0) {
    const { data: contact } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('email', firstContact.email.toLowerCase().trim())
      .single()

    if (contact) {
      for (const ai of myItems) {
        const { data: reminder } = await supabase
          .from('crm_reminders')
          .upsert({
            contact_id: contact.id,
            text: ai.item,
            source: 'fireflies',
            owner: 'mine',
            meeting_id: meeting.id,
            status: 'pending_approval',
            external_id: `ff-mine-${meeting.id}-${ai.item.slice(0, 32)}`,
            updated_at: new Date().toISOString()
          }, { onConflict: 'external_id' })
          .select('id')
          .single()

        if (reminder?.id) myReminderIds.push(reminder.id)
      }
    }
  }

  // Send Telegram approval if there are "mine" items
  let telegramSent = false
  if (myItems.length > 0 && myReminderIds.length > 0) {
    const msgId = await sendTelegramApprovalMessage(meeting, myItems, myReminderIds)
    if (msgId) {
      // Store telegram_msg_id on each reminder for later editing
      await supabase
        .from('crm_reminders')
        .update({ telegram_msg_id: msgId })
        .in('id', myReminderIds)
      telegramSent = true
    }
  }

  // Mark meeting as processed
  await supabase
    .from('crm_processed_meetings')
    .upsert({
      fireflies_id: meeting.id,
      title: meeting.title,
      meeting_date: meetingDate,
      attendee_count: attendees.length,
      action_items_found: actionItems.length,
      processed_at: new Date().toISOString()
    }, { onConflict: 'fireflies_id' })

  return {
    meetingId: meeting.id,
    title: meeting.title,
    contactsUpserted,
    myItems: myItems.length,
    theirItems: theirItems.length,
    telegramSent
  }
}

/** Legacy: bulk sync for manual trigger from CRM UI */
export async function syncContactsFromFireflies() {
  console.log('[CRM Fireflies] Starting legacy bulk sync...')
  const meetings = await getNewMeetings()
  const results = await Promise.all(meetings.map(processMeeting))
  console.log('[CRM Fireflies] Sync done:', results)
  return results
}
