import { NextRequest, NextResponse } from 'next/server'
import { getNewMeetings, processMeeting } from '@/lib/crm/fireflies'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Verify internal token
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[process-new-meetings] Checking for new meetings...')

    const newMeetings = await getNewMeetings()

    if (newMeetings.length === 0) {
      return NextResponse.json({ message: 'No new meetings to process', processed: 0 })
    }

    console.log(`[process-new-meetings] Found ${newMeetings.length} new meetings`)

    const results = []
    for (const meeting of newMeetings) {
      try {
        const result = await processMeeting(meeting)
        results.push(result)
        console.log(`[process-new-meetings] Processed: ${meeting.title}`, result)
      } catch (err) {
        console.error(`[process-new-meetings] Failed to process meeting ${meeting.id}:`, err)
        results.push({ meetingId: meeting.id, error: String(err) })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results
    })
  } catch (err) {
    console.error('[process-new-meetings] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Allow GET for quick manual check
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const meetings = await getNewMeetings()
  return NextResponse.json({
    pendingMeetings: meetings.length,
    meetings: meetings.map(m => ({
      id: m.id,
      title: m.title,
      date: new Date(m.date).toISOString(),
      attendees: m.meeting_attendees?.length ?? 0
    }))
  })
}
