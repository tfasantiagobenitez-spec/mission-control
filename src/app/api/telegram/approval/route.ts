import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTask } from '@/lib/crm/clickup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

async function editTelegramMessage(chatId: string, messageId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: parseInt(messageId),
      text,
      parse_mode: 'Markdown'
    })
  })
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false })
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Handle Telegram callback_query (button press)
  if (!body.callback_query) {
    return NextResponse.json({ ok: true })
  }

  const callbackQuery = body.callback_query
  const callbackData: string = callbackQuery.data || ''
  const callbackQueryId: string = callbackQuery.id
  const chatId: string = String(callbackQuery.message?.chat?.id ?? '')
  const messageId: string = String(callbackQuery.message?.message_id ?? '')

  const [action, reminderId] = callbackData.split(':')

  if (!reminderId || !['approve', 'reject'].includes(action)) {
    await answerCallbackQuery(callbackQueryId, 'Acción desconocida')
    return NextResponse.json({ ok: true })
  }

  // Fetch reminder
  const { data: reminder } = await supabase
    .from('crm_reminders')
    .select('id, text, status, contact_id')
    .eq('id', reminderId)
    .single()

  if (!reminder) {
    await answerCallbackQuery(callbackQueryId, '❌ Recordatorio no encontrado')
    return NextResponse.json({ ok: true })
  }

  if (reminder.status !== 'pending_approval') {
    await answerCallbackQuery(callbackQueryId, 'Ya fue procesado')
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    // Create ClickUp task
    let clickupTaskId: string | null = null
    try {
      // Get contact name for context
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('full_name')
        .eq('id', reminder.contact_id)
        .single()

      clickupTaskId = await createTask({
        name: reminder.text,
        description: contact?.full_name ? `Reunión con ${contact.full_name}` : undefined,
        tags: ['crm', 'from-meeting']
      })
    } catch (err) {
      console.error('[telegram/approval] ClickUp task creation failed:', err)
    }

    await supabase
      .from('crm_reminders')
      .update({
        status: 'task_created',
        approved_at: new Date().toISOString(),
        clickup_task_id: clickupTaskId
      })
      .eq('id', reminderId)

    await answerCallbackQuery(callbackQueryId, '✅ Tarea creada en ClickUp!')

    // Edit Telegram message to confirm
    const taskUrl = clickupTaskId
      ? `\n🔗 [Ver en ClickUp](https://app.clickup.com/t/${clickupTaskId})`
      : ''
    await editTelegramMessage(
      chatId, messageId,
      `✅ *Aprobado y creado en ClickUp*\n\n"${reminder.text}"${taskUrl}`
    )

  } else if (action === 'reject') {
    await supabase
      .from('crm_reminders')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString()
      })
      .eq('id', reminderId)

    await answerCallbackQuery(callbackQueryId, '❌ Rechazado')

    await editTelegramMessage(
      chatId, messageId,
      `❌ *Rechazado*\n\n"${reminder.text}"`
    )
  }

  return NextResponse.json({ ok: true })
}
