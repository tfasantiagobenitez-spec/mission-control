// /api/n8n/callback
// Receives execution results from n8n and sends the final Telegram message.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendTelegram(chatId: number, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 4096),
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
        }),
    }).catch(err => console.error('[n8n/callback] Telegram error:', err))
}

function formatResult(actionType: string, result: any): string {
    if (!result?.success) {
        return `❌ Error al ejecutar ${actionType}:\n${result?.error || 'Error desconocido'}`
    }

    switch (actionType) {
        case 'GMAIL_SEND':
        case 'GMAIL_REPLY':
            return `✅ Email enviado correctamente.`

        case 'CALENDAR_CREATE': {
            const lines = [`✅ *Reunión creada en Google Calendar*`, ``]
            if (result.title)      lines.push(`📋 ${result.title}`)
            if (result.start_fmt)  lines.push(`📅 ${result.start_fmt}`)
            if (result.attendees?.length) lines.push(`👥 ${result.attendees.join(', ')}`)
            if (result.meet_link)  lines.push(`\n🎥 [Unirse al Meet](${result.meet_link})`)
            if (result.event_link) lines.push(`📎 [Ver en Calendar](${result.event_link})`)
            return lines.join('\n')
        }

        case 'CALENDAR_UPDATE':
            return `✅ Evento actualizado.${result.meet_link ? `\n🎥 [Unirse al Meet](${result.meet_link})` : ''}`

        case 'DRIVE_UPLOAD': {
            const lines = [`✅ *Archivo subido a Drive*`, ``]
            if (result.file_name) lines.push(`📄 ${result.file_name}`)
            if (result.view_link) lines.push(`🔗 [Ver archivo](${result.view_link})`)
            if (result.email_sent) lines.push(`\n📧 Email enviado con el archivo adjunto.`)
            return lines.join('\n')
        }

        case 'DRIVE_SEARCH': {
            if (!result.files?.length) return `🔍 No encontré archivos que coincidan con tu búsqueda.`
            const lines = [`🔍 *Archivos encontrados en Drive:*`, ``]
            result.files.forEach((f: any, i: number) => {
                lines.push(`${i + 1}. [${f.name}](${f.webViewLink})`)
            })
            return lines.join('\n')
        }

        default:
            return `✅ Acción completada.`
    }
}

export async function POST(req: NextRequest) {
    // Validate shared secret
    const secret = req.headers.get('x-mission-secret')
    if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { job_id, chat_id, action_type, result, error } = body

    // Update job status in Supabase
    if (job_id) {
        await supabase
            .from('n8n_jobs')
            .update({
                status: error ? 'error' : 'success',
                result: result ?? null,
                error_msg: error ?? null,
                completed_at: new Date().toISOString(),
            })
            .eq('id', job_id)
    }

    // Send Telegram message with formatted result
    if (chat_id) {
        const message = formatResult(action_type, error ? { success: false, error } : result)
        await sendTelegram(chat_id, message)
    }

    return NextResponse.json({ ok: true })
}
