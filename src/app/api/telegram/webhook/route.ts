import { NextResponse } from 'next/server'
import { chatCompletion, ChatMessage } from '@/lib/openrouter'
import { fetchRecentEmails } from '@/lib/email-service'
import { fetchGoogleCalendarEvents } from '@/lib/calendar-service'
import { searchCRM } from '@/lib/crm/search'
import { USER_CONTEXT } from '@/lib/user-context'
import { agentOrchestrator } from '@/lib/agent'
import { createClient } from '@supabase/supabase-js'
import { createTask } from '@/lib/crm/clickup'
import { ingestSource, detectSourceType } from '@/lib/knowledge/ingest'
import { searchKnowledge, formatKnowledgeContext } from '@/lib/knowledge/search'
import { syncYouTubeChannel } from '@/lib/knowledge/youtube-channel'
import path from 'path'
import os from 'os'
import fsSync from 'fs'
import fs from 'fs/promises'
import OpenAI from 'openai'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1'
})

export const maxDuration = 30 // Allow up to 30s for Vercel serverless

export async function POST(req: Request) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
        return NextResponse.json({ error: 'Telegram token missing' }, { status: 500 })
    }

    try {
        const body = await req.json()

        // Handle inline button callbacks (approve/reject from Fireflies pipeline)
        if (body.callback_query) {
            await processApprovalCallback(body.callback_query, token)
            return NextResponse.json({ ok: true })
        }

        const message = body.message
        if (!message || (!message.text && !message.voice)) {
            return NextResponse.json({ ok: true })
        }

        // Process BEFORE returning — Vercel kills the function after response
        await processMessageAsync(message, token)

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Error handling Telegram webhook:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

async function processApprovalCallback(callbackQuery: any, token: string) {
    const callbackData: string = callbackQuery.data || ''
    const callbackQueryId: string = callbackQuery.id
    const chatId: number = callbackQuery.message?.chat?.id
    const messageId: number = callbackQuery.message?.message_id

    const [action, reminderId] = callbackData.split(':')

    if (!reminderId || !['approve', 'reject'].includes(action)) return

    const { data: reminder } = await supabase
        .from('crm_reminders')
        .select('id, text, status, contact_id')
        .eq('id', reminderId)
        .single()

    if (!reminder || reminder.status !== 'pending_approval') {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text: 'Ya fue procesado' })
        })
        return
    }

    if (action === 'approve') {
        let clickupTaskId: string | null = null
        try {
            const { data: contact } = await supabase
                .from('crm_contacts').select('full_name').eq('id', reminder.contact_id).single()
            clickupTaskId = await createTask({
                name: reminder.text,
                description: contact?.full_name ? `Reunión con ${contact.full_name}` : undefined,
                tags: ['crm', 'from-meeting']
            })
        } catch (err) {
            console.error('[approval] ClickUp failed:', err)
        }

        await supabase.from('crm_reminders').update({
            status: 'task_created', approved_at: new Date().toISOString(), clickup_task_id: clickupTaskId
        }).eq('id', reminderId)

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text: '✅ Tarea creada en ClickUp!' })
        })

        const taskUrl = clickupTaskId ? `\n🔗 https://app.clickup.com/t/${clickupTaskId}` : ''
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: `✅ *Creado en ClickUp*\n"${reminder.text}"${taskUrl}`, parse_mode: 'Markdown' })
        })

    } else {
        await supabase.from('crm_reminders').update({
            status: 'rejected', rejected_at: new Date().toISOString()
        }).eq('id', reminderId)

        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text: '❌ Rechazado' })
        })

        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: `❌ *Rechazado*\n"${reminder.text}"`, parse_mode: 'Markdown' })
        })
    }
}

async function processMessageAsync(message: any, token: string) {
    const chatId = message.chat.id
    let text = message.text ? message.text.toLowerCase() : ''

    if (message.voice) {
        try {
            // 1. Get file path from Telegram
            const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${message.voice.file_id}`)
            const fileData = await fileRes.json()
            if (!fileData.ok) throw new Error("Could not get voice file path")

            // 2. Download the file
            const fileUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`
            const tmpPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`)

            const audioRes = await fetch(fileUrl)
            if (!audioRes.ok) throw new Error(`Download failed: ${audioRes.status}`)
            const buffer = Buffer.from(await audioRes.arrayBuffer())
            fsSync.writeFileSync(tmpPath, buffer)

            // 3. Send to Whisper API
            const transcription = await openai.audio.transcriptions.create({
                file: fsSync.createReadStream(tmpPath),
                model: 'whisper-1'
            })

            text = transcription.text.toLowerCase()

            // Clean up
            await fs.unlink(tmpPath)

            // Notify user what we heard
            await sendTelegramMessage(chatId, `🎙️ *Escuché:* "${transcription.text}"`, token)

        } catch (err: any) {
            console.error("Whisper Error:", err)
            await sendTelegramMessage(chatId, `⚠️ Error procesando audio: ${err.message}`, token)
            return
        }
    }

    // ── Knowledge Base Commands ──
    if (text === '/kb' || text.startsWith('/kb ')) {
      const query = text.replace('/kb', '').trim()
      if (!query) {
        await sendTelegramMessage(chatId, '🧠 Uso: `/kb [pregunta]`\nEj: `/kb qué es el AI Brief de hoy`', token)
        return
      }
      await sendTelegramMessage(chatId, `🔍 Buscando en tu knowledge base...`, token)
      const results = await searchKnowledge(query, 3)
      if (results.length === 0) {
        await sendTelegramMessage(chatId, '❌ No encontré nada relevante en tu knowledge base para esa búsqueda.', token)
      } else {
        let reply = `🧠 *Resultados para:* "${query}"\n\n`
        results.forEach((r, i) => {
          reply += `*[${i+1}] ${r.title || r.sourceUrl}*\n${r.text.slice(0, 300)}...\n\n`
        })
        await sendTelegramMessage(chatId, reply, token)
      }
      return
    }

    if (text === '/sync_channel' || text.startsWith('/sync_channel ')) {
      const handle = text.replace('/sync_channel', '').trim() || '@AIDailyBrief'
      await sendTelegramMessage(chatId, `📺 Sincronizando canal *${handle}*...\nTe aviso cuando termine (puede tardar unos minutos).`, token)
      // Fire & forget — calls dedicated endpoint with high maxDuration to avoid webhook 30s timeout
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || 'https://mission-control-santi.vercel.app'
      fetch(`${baseUrl}/api/knowledge/sync-channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`
        },
        body: JSON.stringify({ channel: handle, maxVideos: 20, chatId })
      }).catch(err => console.error('[sync_channel] fire-and-forget error:', err))
      return
    }

    // ── Auto-ingest URLs ──
    const originalText = message.text || text
    const urlMatch = originalText.match(/https?:\/\/[^\s]+/)
    if (urlMatch && !message.voice) {
      const url = urlMatch[0]
      const type = detectSourceType(url)
      if (type === 'youtube' || type === 'article') {
        await sendTelegramMessage(chatId, `⏳ Ingresando a tu knowledge base...`, token)
        try {
          const result = await ingestSource(url, type)
          if (result.alreadyExists) {
            await sendTelegramMessage(chatId, `ℹ️ Ya estaba en tu KB: *${result.title}*`, token)
          } else {
            await sendTelegramMessage(chatId,
              `✅ *Agregado a tu Knowledge Base*\n` +
              `📄 ${result.title}\n` +
              `🔢 ${result.chunkCount} fragmentos indexados\n` +
              `💡 ${result.summary}`,
              token
            )
          }
        } catch (err: any) {
          await sendTelegramMessage(chatId, `⚠️ No pude ingestar la URL: ${err.message}`, token)
        }
        return
      }
    }

    if (text === '/chatid') {
        await sendTelegramMessage(chatId, `Tu Chat ID es: \`${chatId}\`\n\nAgregalo en .env.local como:\nTELEGRAM_CHAT_ID=${chatId}`, token)
    } else if (text === '/start') {
        await sendTelegramMessage(chatId, "¡Hola! Soy tu asistente. Puedo leer tus correos, revisar tu agenda y responder preguntas sobre Arecco IA.", token)
    } else if (text === '/calendar') {
        const events = await fetchGoogleCalendarEvents(5)
        let messageText = "📅 *Tus próximos eventos en Google Calendar:*\n\n"
        if (events.length === 0) {
            messageText = "No tienes eventos próximos programados."
        } else {
            events.forEach((t: any) => {
                messageText += `• *${t.title}*\n  🗓 ${t.startTime}\n\n`
            })
        }
        await sendTelegramMessage(chatId, messageText, token)
    } else {
        try {
            // Fetch live context - concurrent with memory load + knowledge base
            const [recentEmails, upcomingEvents, crmContacts, memoryContext, knowledgeResults] = await Promise.all([
                fetchRecentEmails(5).catch(() => []),
                fetchGoogleCalendarEvents(5).catch(() => []),
                searchCRM(text, 3).catch(() => []),
                agentOrchestrator.loadMemory(text).catch(() => ({ coreFacts: [], recentMessages: [], semanticMatches: [], conversationSummary: undefined })),
                searchKnowledge(text, 3).catch(() => [])
            ])

            let liveContext = `\n\n=== MEMORIA Y CONTEXTO ===\n`

            if (memoryContext.coreFacts?.length > 0) {
                liveContext += `**Hechos conocidos sobre Santi:**\n`
                memoryContext.coreFacts.forEach((f: any) => {
                    liveContext += `- ${f.key}: ${f.value}\n`
                })
            }

            if (memoryContext.semanticMatches?.length > 0) {
                liveContext += `\n**Recuerdos relevantes de conversaciones pasadas:**\n`
                memoryContext.semanticMatches.forEach((m: any) => {
                    liveContext += `- ${m.metadata?.text}\n`
                })
            }

            if (memoryContext.conversationSummary) {
                liveContext += `\n**Resumen de la sesión:** ${memoryContext.conversationSummary}\n`
            }

            liveContext += `\n**Correos recientes:**\n`
            if (recentEmails.length > 0) {
                recentEmails.forEach((e: any) => {
                    liveContext += `- De: ${e.sender} | Asunto: ${e.subject}\n`
                })
            }

            liveContext += `\n**Próximos eventos:**\n`
            if (upcomingEvents.length > 0) {
                upcomingEvents.forEach((t: any) => {
                    liveContext += `- ${t.title} (${t.startTime})\n`
                })
            }

            liveContext += `\n**Contactos CRM Relevantes:**\n`
            if (crmContacts && crmContacts.length > 0) {
                crmContacts.forEach((c: any) => {
                    liveContext += `- ${c.full_name} (${c.company || 'Sin Empresa'}) | Salud: ${c.relationship_score} | Rol: ${c.role || 'N/A'}\n`
                })
            }

            // Inject knowledge base context if relevant results found
            const kbContext = formatKnowledgeContext(knowledgeResults)
            if (kbContext) liveContext += kbContext

            liveContext += `=============================\n`
            liveContext += `Usa la memoria y el contexto en tiempo real para ser lo más preciso posible. Si Santi pregunta por algo que ya te dijo, demostrá que lo recordás. Si hay contexto de la Knowledge Base, usalo activamente en tu respuesta y citá la fuente.`

            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `Eres el asistente personal de Santi. Usa este perfil para guiar tu tono e identidad corporativa:\n\n${USER_CONTEXT}${liveContext}`
                },
                {
                    role: 'user',
                    content: message.text || text
                }
            ]

            const completion = await chatCompletion({ messages, temperature: 0.7 })
            const aiResponse = completion.choices[0]?.message?.content || "No pude procesar la respuesta."
            await sendTelegramMessage(chatId, aiResponse, token)
        } catch (aiError: any) {
            console.error('AI Processing Error:', aiError)
            await sendTelegramMessage(chatId, `⚠️ Error en IA: ${aiError.message || "Desconocido"}`, token)
        }
    }
}

async function sendTelegramMessage(chatId: number, text: string, token: string) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    })
}
