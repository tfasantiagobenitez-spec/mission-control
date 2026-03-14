import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!

const ARCHIVE_AFTER_DAYS = 14

async function sendTelegramMessage(text: string) {
  if (!BOT_TOKEN || !CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
  })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (auth.replace('Bearer ', '') !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const archiveCutoff = new Date(now.getTime() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // ── 1. Auto-archive old completed/rejected/waiting items ───────────────────
  const { count: archived } = await supabase
    .from('crm_reminders')
    .update({ status: 'archived', updated_at: now.toISOString() })
    .in('status', ['task_created', 'rejected', 'waiting_on'])
    .lt('updated_at', archiveCutoff)
    .select('id')

  // ── 2. Fetch active items for the summary report ───────────────────────────
  const { data: pending } = await supabase
    .from('crm_reminders')
    .select('id, text, created_at, crm_contacts(full_name)')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })
    .limit(10)

  const { data: waitingOn } = await supabase
    .from('crm_reminders')
    .select('id, text, updated_at, crm_contacts(full_name)')
    .eq('status', 'waiting_on')
    .order('updated_at', { ascending: false })
    .limit(10)

  const { data: overdue } = await supabase
    .from('crm_reminders')
    .select('id, text, due_date, crm_contacts(full_name)')
    .eq('status', 'task_created')
    .not('due_date', 'is', null)
    .lt('due_date', now.toISOString())
    .order('due_date', { ascending: true })
    .limit(10)

  // ── 3. Build and send Telegram report ─────────────────────────────────────
  const timeStr = now.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit'
  })

  let msg = `📊 *Check de tareas — ${timeStr}*\n\n`

  if (overdue && overdue.length > 0) {
    msg += `🔴 *Vencidas (${overdue.length}):*\n`
    overdue.forEach(r => {
      const contact = (r.crm_contacts as unknown as { full_name: string } | null)?.full_name || '?'
      msg += `  • ${r.text} _(${contact})_\n`
    })
    msg += '\n'
  }

  if (pending && pending.length > 0) {
    msg += `⏳ *Esperando aprobación (${pending.length}):*\n`
    pending.forEach(r => {
      const contact = (r.crm_contacts as unknown as { full_name: string } | null)?.full_name || '?'
      msg += `  • ${r.text} _(${contact})_\n`
    })
    msg += '\n'
  }

  if (waitingOn && waitingOn.length > 0) {
    msg += `👀 *Waiting on them (${waitingOn.length}):*\n`
    waitingOn.forEach(r => {
      const contact = (r.crm_contacts as unknown as { full_name: string } | null)?.full_name || '?'
      msg += `  • ${r.text} _(${contact})_\n`
    })
    msg += '\n'
  }

  if (!overdue?.length && !pending?.length && !waitingOn?.length) {
    msg += `✅ Todo limpio — no hay items pendientes.\n`
  }

  if ((archived ?? 0) > 0) {
    msg += `\n🗂️ _${archived} items archivados automáticamente (>14 días)_`
  }

  await sendTelegramMessage(msg)

  return NextResponse.json({
    ok: true,
    archived: archived ?? 0,
    pending: pending?.length ?? 0,
    waitingOn: waitingOn?.length ?? 0,
    overdue: overdue?.length ?? 0
  })
}

// GET for quick manual check
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (auth.replace('Bearer ', '') !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(req)
}
