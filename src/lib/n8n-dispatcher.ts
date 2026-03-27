// n8n-dispatcher.ts
// Handles structured actions from Claude.
// Google actions (Gmail, Calendar, Drive) run directly via Supabase tokens.
// Other actions dispatch to n8n.

import { createClient } from '@supabase/supabase-js'
import { refreshGoogleToken } from '@/lib/gmail'

export interface ParsedAction {
    type:
        | 'GMAIL_SEND'
        | 'GMAIL_REPLY'
        | 'CALENDAR_CREATE'
        | 'CALENDAR_UPDATE'
        | 'DRIVE_UPLOAD'
        | 'DRIVE_SEARCH'
    params: Record<string, any>
}

export interface DispatchContext {
    chatId: number
    action: ParsedAction
    telegramFileId?: string
}

export function extractAction(claudeResponse: string): ParsedAction | null {
    const match = claudeResponse.match(/```action\n([\s\S]*?)\n```/)
    if (!match) return null
    try {
        const parsed = JSON.parse(match[1])
        if (!parsed.type || !parsed.params) return null
        return parsed as ParsedAction
    } catch {
        return null
    }
}

export function stripActionBlock(claudeResponse: string): string {
    return claudeResponse.replace(/```action\n[\s\S]*?\n```/, '').trim()
}

// ── Google token helper ──────────────────────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let { data: tokenData } = await supabase
        .from('google_tokens')
        .select('*')
        .ilike('email', 'sbenitez@areccoia.com')
        .maybeSingle()

    if (!tokenData) {
        const { data: fallback } = await supabase.from('google_tokens').select('*').limit(1)
        tokenData = fallback?.[0] ?? null
    }

    if (!tokenData) throw new Error('No hay cuenta Google conectada en Supabase')

    let accessToken = tokenData.access_token
    if (tokenData.expires_at < Date.now() + 60000 && tokenData.refresh_token) {
        const refreshed = await refreshGoogleToken(tokenData.refresh_token)
        accessToken = refreshed.access_token
        await supabase.from('google_tokens').update({
            access_token: accessToken,
            expires_at: Date.now() + (refreshed.expires_in * 1000),
            updated_at: new Date().toISOString(),
        }).ilike('email', 'sbenitez@areccoia.com')
    }

    return accessToken
}

// ── Telegram bot helper (send result back to user) ───────────────────────────

async function sendTelegram(chatId: number, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    }).catch(() => {})
}

// ── Action handlers ──────────────────────────────────────────────────────────

async function handleGmailSend(params: Record<string, any>, chatId: number) {
    const accessToken = await getGoogleAccessToken()

    // Build RFC 2822 message
    const to = params.to
    const subject = params.subject
    const body = params.body
    const cc = params.cc || ''

    const lines = [
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        '',
        body,
    ]

    const raw = Buffer.from(lines.join('\r\n')).toString('base64url')

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
    })

    if (!res.ok) {
        const err = await res.json()
        throw new Error(`Gmail error: ${err.error?.message || JSON.stringify(err)}`)
    }

    const sent = await res.json()
    await sendTelegram(chatId, `✅ <b>Email enviado</b>\n📧 Para: ${to}\n📝 Asunto: ${subject}\n🆔 ID: <code>${sent.id}</code>`)
    return `sent:${sent.id}`
}

async function handleGmailReply(params: Record<string, any>, chatId: number) {
    const accessToken = await getGoogleAccessToken()

    const lines = [
        `To: ${params.to}`,
        `Subject: ${params.subject}`,
        `In-Reply-To: ${params.message_id}`,
        `References: ${params.message_id}`,
        `Content-Type: text/plain; charset=utf-8`,
        '',
        params.body,
    ]

    const raw = Buffer.from(lines.join('\r\n')).toString('base64url')

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, threadId: params.thread_id }),
    })

    if (!res.ok) {
        const err = await res.json()
        throw new Error(`Gmail reply error: ${err.error?.message || JSON.stringify(err)}`)
    }

    const sent = await res.json()
    await sendTelegram(chatId, `✅ <b>Respuesta enviada</b>\n📧 Para: ${params.to}\n📝 ${params.subject}`)
    return `replied:${sent.id}`
}

async function handleCalendarCreate(params: Record<string, any>, chatId: number) {
    const accessToken = await getGoogleAccessToken()

    const event: any = {
        summary: params.title,
        description: params.description || '',
        start: { dateTime: params.start_iso, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: params.end_iso, timeZone: 'America/Argentina/Buenos_Aires' },
    }

    if (params.attendees?.length) {
        event.attendees = params.attendees.map((email: string) => ({ email }))
    }

    if (params.add_meet !== false) {
        event.conferenceData = {
            createRequest: { requestId: `mc-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
        }
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all${params.add_meet !== false ? '&conferenceDataVersion=1' : ''}`

    const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    })

    if (!res.ok) {
        const err = await res.json()
        throw new Error(`Calendar error: ${err.error?.message || JSON.stringify(err)}`)
    }

    const created = await res.json()
    const meetLink = created.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || ''
    const formatted = new Date(params.start_iso).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    })

    let reply = `✅ <b>Reunión creada</b>\n📋 ${params.title}\n📅 ${formatted}`
    if (params.attendees?.length) reply += `\n👥 ${params.attendees.join(', ')}`
    if (meetLink) reply += `\n🎥 <a href="${meetLink}">Unirse por Meet</a>`
    if (created.htmlLink) reply += `\n🔗 <a href="${created.htmlLink}">Ver en Calendar</a>`

    await sendTelegram(chatId, reply)
    return `created:${created.id}`
}

async function handleDriveSearch(params: Record<string, any>, chatId: number) {
    const accessToken = await getGoogleAccessToken()

    const q = encodeURIComponent(`name contains '${params.query}'`)
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,size,mimeType)&pageSize=${params.max_results || 10}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) {
        const err = await res.json()
        throw new Error(`Drive error: ${err.error?.message || JSON.stringify(err)}`)
    }

    const data = await res.json()
    const files = data.files || []

    if (!files.length) {
        await sendTelegram(chatId, `🔍 No se encontraron archivos con "${params.query}"`)
        return 'search:empty'
    }

    const lines = files.map((f: any, i: number) => {
        const link = f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`
        const size = f.size ? ` — ${Math.round(Number(f.size) / 1024)} KB` : ''
        return `${i + 1}. <a href="${link}"><b>${f.name}</b></a>${size}\n   🆔 <code>${f.id}</code>`
    }).join('\n\n')

    await sendTelegram(chatId, `📁 <b>Archivos encontrados (${files.length}):</b>\n\n${lines}`)
    return `search:${files.length}`
}

async function handleDriveUpload(params: Record<string, any>, chatId: number, telegramFileId?: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN!
    const accessToken = await getGoogleAccessToken()
    const fileId = telegramFileId || params.telegram_file_id
    if (!fileId) throw new Error('No file_id disponible para subir a Drive')

    // Get Telegram file path
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json()
    if (!fileData.ok) throw new Error('No se pudo obtener el archivo de Telegram')

    // Download file
    const downloadRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`)
    if (!downloadRes.ok) throw new Error('Error descargando archivo de Telegram')
    const buffer = await downloadRes.arrayBuffer()

    const filename = params.filename || fileData.result.file_path.split('/').pop() || 'upload'

    // Upload to Drive (multipart)
    const metadata = JSON.stringify({ name: filename })
    const boundary = '-------314159265358979323846'
    const mimeType = params.mime_type || 'application/octet-stream'

    const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
        Buffer.from(buffer),
        Buffer.from(`\r\n--${boundary}--`),
    ])

    const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body,
        }
    )

    if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(`Drive upload error: ${err.error?.message || JSON.stringify(err)}`)
    }

    const uploaded = await uploadRes.json()
    const link = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`
    await sendTelegram(chatId, `✅ <b>Archivo subido a Drive</b>\n📄 ${uploaded.name}\n🔗 <a href="${link}">Abrir</a>\n🆔 <code>${uploaded.id}</code>`)
    return `uploaded:${uploaded.id}`
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

export async function dispatchToN8n(ctx: DispatchContext): Promise<string | null> {
    const { type, params } = ctx.action

    try {
        switch (type) {
            case 'GMAIL_SEND':
                return await handleGmailSend(params, ctx.chatId)
            case 'GMAIL_REPLY':
                return await handleGmailReply(params, ctx.chatId)
            case 'CALENDAR_CREATE':
                return await handleCalendarCreate(params, ctx.chatId)
            case 'DRIVE_SEARCH':
                return await handleDriveSearch(params, ctx.chatId)
            case 'DRIVE_UPLOAD':
                return await handleDriveUpload(params, ctx.chatId, ctx.telegramFileId)
            case 'CALENDAR_UPDATE':
                console.warn('[dispatcher] CALENDAR_UPDATE not yet implemented')
                await sendTelegram(ctx.chatId, '⚠️ Modificar eventos de Calendar aún no está implementado. Usá Google Calendar directamente.')
                return null
            default:
                return null
        }
    } catch (err: any) {
        console.error(`[dispatcher] Error handling ${type}:`, err.message)
        await sendTelegram(ctx.chatId, `❌ Error ejecutando ${type}: ${err.message}`)
        return null
    }
}
