import { NextResponse } from 'next/server'
import { chatCompletion, ChatMessage } from '@/lib/openrouter'
import { fetchRecentEmails } from '@/lib/email-service'
import { fetchGoogleCalendarEvents } from '@/lib/calendar-service'
import { searchCRM } from '@/lib/crm/search'
import { USER_CONTEXT } from '@/lib/user-context'
import { agentOrchestrator } from '@/lib/agent'
import path from 'path'
import os from 'os'
import fsSync from 'fs'
import fs from 'fs/promises'
import OpenAI from 'openai'

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

    if (text === '/start') {
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
            // Fetch live context - concurrent with memory load
            const [recentEmails, upcomingEvents, crmContacts, memoryContext] = await Promise.all([
                fetchRecentEmails(5).catch(() => []),
                fetchGoogleCalendarEvents(5).catch(() => []),
                searchCRM(text, 3).catch(() => []),
                agentOrchestrator.loadMemory(text).catch(() => ({ coreFacts: [], recentMessages: [], semanticMatches: [], conversationSummary: undefined }))
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

            liveContext += `=============================\n`
            liveContext += `Usa la memoria y el contexto en tiempo real para ser lo más preciso posible. Si Santi pregunta por algo que ya te dijo, demostrá que lo recordás.`

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
