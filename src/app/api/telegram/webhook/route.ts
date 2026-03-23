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
import { queryKBNotebook } from '@/lib/knowledge/notebooklm'
import { getCRMClient } from '@/lib/crm/business-client'
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
    // Normalize: lowercase + trim + strip bot username suffix (e.g. /leads@botname → /leads)
    let text = message.text ? message.text.toLowerCase().trim().replace(/@\w+$/, '').trim() : ''

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

    // ── NotebookLM Query ──
    if (text === '/nb' || text.startsWith('/nb ')) {
      const query = text.replace('/nb', '').trim()
      if (!query) {
        await sendTelegramMessage(chatId, '🧠 Uso: `/nb [pregunta]`\nEj: `/nb qué avanzamos con el proyecto de drones`', token)
        return
      }
      await sendTelegramMessage(chatId, `🔍 Consultando NotebookLM...`, token)
      const answer = await queryKBNotebook(query)
      await sendTelegramMessage(chatId, answer ? `🧠 *NotebookLM:*\n\n${answer}` : '❌ Sin respuesta de NotebookLM', token)
      return
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

    // ── Advisory Council Command ──
    // Usage: /advisory [project name]
    // Example: /advisory Arecco IA
    if (text === '/advisory' || text.startsWith('/advisory ')) {
      const project = message.text?.replace(/^\/advisory\s*/i, '').trim() || 'General'
      await sendTelegramMessage(chatId, `🧠 Iniciando AI Advisory Council para <b>${project}</b>...\n\nEsto puede tardar 30-60 segundos.`, token)

      // Fire and forget — runs in background, sends Telegram message when done
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.NEXTAUTH_URL || 'http://localhost:3008')

      fetch(`${baseUrl}/api/advisory/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`,
        },
        body: JSON.stringify({ project, sendToTelegram: true, logDecisions: true }),
      }).catch(err => console.error('[advisory] fire-and-forget error:', err))

      return
    }

    if (text === '/sync_channel' || text.startsWith('/sync_channel ')) {
      const handle = text.replace('/sync_channel', '').trim() || '@AIDailyBrief'
      await sendTelegramMessage(chatId, `📺 Sincronizando canal *${handle}*...\nTe aviso cuando termine (puede tardar unos minutos).`, token)
      // Fire & forget — calls dedicated endpoint with high maxDuration to avoid webhook 30s timeout
      // VERCEL_URL is auto-set by Vercel in production (without protocol), NEXTAUTH_URL used for local dev
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXTAUTH_URL || 'http://localhost:3008')
      fetch(`${vercelUrl}/api/knowledge/sync-channel`, {
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

    // ── CRM Commands ──────────────────────────────────────────────────────────
    // Debug: log what command arrived
    if (text.startsWith('/')) {
        console.log(`[webhook] Command received: "${text}" (original: "${message.text}")`)
    }

    if (text === '/status') {
        const crm = getCRMClient()
        const [clientsRes, leadsRes, dealsRes, projectsRes] = await Promise.all([
            crm.from('clients').select('id, status'),
            crm.from('leads').select('id, status'),
            crm.from('deals').select('id, value, updated_at'),
            crm.from('projects').select('id, status'),
        ])
        const clients = clientsRes.data || []
        const leads = leadsRes.data || []
        const deals = dealsRes.data || []
        const projects = projectsRes.data || []
        const pipeline = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)
        const activeLeads = leads.filter(l => !['converted', 'unqualified'].includes(l.status))
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const staleDeals = deals.filter(d => d.updated_at < sevenDaysAgo)
        const msg = [
            `📊 *Estado del negocio — Arecco IA*`,
            ``,
            `💰 Pipeline: $${pipeline.toLocaleString()}`,
            `🤝 Clientes activos: ${clients.filter(c => c.status === 'active').length}`,
            `🎯 Leads en curso: ${activeLeads.length}`,
            `📁 Proyectos activos: ${projects.filter(p => p.status === 'active' || p.status === 'pending').length}`,
            staleDeals.length > 0 ? `⚠️ Deals sin mover: ${staleDeals.length}` : `✅ Pipeline al día`,
        ].join('\n')
        await sendTelegramMessage(chatId, msg, token)
        return
    }

    if (text === '/leads') {
        const crm = getCRMClient()
        const { data: leads } = await crm
            .from('leads')
            .select('first_name, last_name, company, status, source, created_at')
            .not('status', 'in', '("converted","unqualified")')
            .order('created_at', { ascending: false })
            .limit(10)
        if (!leads || leads.length === 0) {
            await sendTelegramMessage(chatId, '✅ No hay leads activos en este momento.', token)
            return
        }
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        let msg = `🎯 *Leads activos (${leads.length}):*\n\n`
        leads.forEach(l => {
            const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000)
            const stale = l.created_at < threeDaysAgo ? ' ⚠️' : ''
            msg += `• *${l.first_name} ${l.last_name ?? ''}*${l.company ? ` — ${l.company}` : ''}\n`
            msg += `  ${l.status} · ${l.source} · ${days}d${stale}\n`
        })
        await sendTelegramMessage(chatId, msg, token)
        return
    }

    if (text === '/pipeline') {
        const crm = getCRMClient()
        const { data: deals } = await crm
            .from('deals')
            .select('title, value, currency, probability, updated_at, deal_stages(name)')
            .order('value', { ascending: false })
            .limit(10)
        if (!deals || deals.length === 0) {
            await sendTelegramMessage(chatId, 'No hay deals en el pipeline.', token)
            return
        }
        const total = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)
        const weighted = deals.reduce((s, d) => s + (Number(d.value) || 0) * ((Number(d.probability) || 0) / 100), 0)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        let msg = `📈 *Pipeline — $${total.toLocaleString()} total*\n`
        msg += `⚖️ Ponderado: $${Math.round(weighted).toLocaleString()}\n\n`
        deals.forEach(d => {
            const stageData = d.deal_stages as unknown as { name: string } | null
            const stage = stageData?.name ?? '?'
            const days = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)
            const stale = d.updated_at < sevenDaysAgo ? ' ⚠️' : ''
            msg += `• *${d.title}*\n  $${Number(d.value).toLocaleString()} · ${stage} · ${days}d${stale}\n`
        })
        await sendTelegramMessage(chatId, msg, token)
        return
    }

    if (text === '/proyectos') {
        const crm = getCRMClient()
        const { data: projects } = await crm
            .from('projects')
            .select('name, status, description, updated_at')
            .in('status', ['active', 'pending'])
            .order('updated_at', { ascending: false })
            .limit(10)
        if (!projects || projects.length === 0) {
            await sendTelegramMessage(chatId, 'No hay proyectos activos.', token)
            return
        }
        let msg = `📁 *Proyectos activos (${projects.length}):*\n\n`
        projects.forEach(p => {
            const days = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000)
            const stale = days > 7 ? ' ⚠️' : ''
            msg += `• *${p.name}* [${p.status}] · ${days}d${stale}\n`
            if (p.description) msg += `  ${p.description.slice(0, 80)}\n`
        })
        await sendTelegramMessage(chatId, msg, token)
        return
    }

    // /lead nombre, empresa — crea un lead rápido
    // Ej: /lead Juan García, Acme Corp
    if (text.startsWith('/lead ')) {
        const raw = message.text?.replace(/^\/lead\s*/i, '').trim() || ''
        if (!raw) {
            await sendTelegramMessage(chatId, '🎯 Uso: `/lead Nombre Apellido, Empresa`\nEj: `/lead Juan García, Acme Corp`', token)
            return
        }
        // Parse "Nombre Apellido, Empresa"
        const parts = raw.split(',').map((s: string) => s.trim())
        const fullName = parts[0] || ''
        const company = parts[1] || null
        const nameParts = fullName.split(' ')
        const first_name = nameParts[0] || fullName
        const last_name = nameParts.slice(1).join(' ') || null

        const crm = getCRMClient()
        const { error } = await crm.from('leads').insert({
            first_name,
            last_name,
            company,
            source: 'manual',
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).select().single()

        if (error) {
            await sendTelegramMessage(chatId, `❌ Error al crear lead: ${error.message}`, token)
            return
        }
        await sendTelegramMessage(chatId,
            `✅ *Lead creado*\n👤 ${first_name}${last_name ? ' ' + last_name : ''}${company ? `\n🏢 ${company}` : ''}\n📊 Status: Nuevo\n\nVerlo en Mission Control → Leads`,
            token
        )
        return
    }

    // /fact proyecto | clave | valor  → guarda fact vinculado a un proyecto
    // /fact clave | valor             → guarda fact global (sin proyecto)
    // Ej: /fact drones | inversor | TechFund, contacto Marcos
    // Ej: /fact preferencia_idioma | español
    if (text.startsWith('/fact ')) {
        const raw = message.text?.replace(/^\/fact\s*/i, '').trim() || ''
        if (!raw) {
            await sendTelegramMessage(chatId,
                `📝 *Guardar un hecho*\n\n` +
                `Con proyecto:\n\`/fact [proyecto] | [clave] | [valor]\`\n` +
                `Ej: \`/fact drones | inversor | TechFund, contacto Marcos\`\n\n` +
                `Global (sin proyecto):\n\`/fact [clave] | [valor]\`\n` +
                `Ej: \`/fact idioma_preferido | español\``,
                token)
            return
        }
        const parts = raw.split('|').map((s: string) => s.trim())
        let project: string | null = null
        let key: string
        let value: string
        if (parts.length >= 3) {
            // /fact proyecto | clave | valor
            project = parts[0].toLowerCase().replace(/\s+/g, '_')
            key = parts[1].toLowerCase().replace(/\s+/g, '_')
            value = parts.slice(2).join('|').trim()
        } else if (parts.length === 2) {
            // /fact clave | valor (global)
            key = parts[0].toLowerCase().replace(/\s+/g, '_')
            value = parts[1]
        } else {
            await sendTelegramMessage(chatId, '⚠️ Formato: `/fact [proyecto] | [clave] | [valor]`', token)
            return
        }
        const { error } = await supabase
            .from('conversation_facts')
            .upsert(
                { key, value, source: 'manual', project, updated_at: new Date().toISOString() },
                { onConflict: 'key,project' }
            )
        if (error) {
            await sendTelegramMessage(chatId, `❌ Error al guardar: ${error.message}`, token)
            return
        }
        const scope = project ? `proyecto *${project}*` : `contexto global`
        await sendTelegramMessage(chatId,
            `✅ *Hecho guardado* (${scope})\n\n🔑 \`${key}\`\n📝 ${value}`,
            token)
        return
    }

    // /facts [proyecto]  → lista facts de un proyecto (o todos si no especifica)
    if (text === '/facts' || text.startsWith('/facts ')) {
        const projectFilter = message.text?.replace(/^\/facts\s*/i, '').trim() || null
        let query = supabase
            .from('conversation_facts')
            .select('key, value, project, updated_at')
            .order('updated_at', { ascending: false })
            .limit(30)
        if (projectFilter) {
            query = query.eq('project', projectFilter.toLowerCase().replace(/\s+/g, '_'))
        }
        const { data: facts, error } = await query
        if (error || !facts || facts.length === 0) {
            const scope = projectFilter ? `proyecto *${projectFilter}*` : 'sistema'
            await sendTelegramMessage(chatId, `No hay hechos guardados para ${scope}.`, token)
            return
        }
        const grouped: Record<string, typeof facts> = {}
        facts.forEach(f => {
            const group = f.project || '🌐 global'
            if (!grouped[group]) grouped[group] = []
            grouped[group].push(f)
        })
        let msg = projectFilter
            ? `📋 *Facts — ${projectFilter}:*\n\n`
            : `📋 *Facts guardados:*\n\n`
        Object.entries(grouped).forEach(([group, items]) => {
            msg += `*${group}*\n`
            items.forEach(f => { msg += `  • \`${f.key}\`: ${f.value}\n` })
            msg += '\n'
        })
        await sendTelegramMessage(chatId, msg, token)
        return
    }

    if (text === '/ayuda' || text === '/help') {
        const msg = [
            `🤖 *Mission Control — Comandos*`,
            ``,
            `📊 */status* — KPIs del negocio`,
            `🎯 */leads* — Leads activos`,
            `📈 */pipeline* — Deals en curso`,
            `📁 */proyectos* — Proyectos activos`,
            `📅 */calendar* — Próximos eventos`,
            `🧠 */advisory [proyecto]* — Advisory Council`,
            `🔍 */kb [pregunta]* — Knowledge base`,
            ``,
            `✏️ *Acciones rápidas:*`,
            `➕ */lead Nombre, Empresa* — Crear lead`,
            `📝 */fact [proyecto] | [clave] | [valor]* — Guardar info de proyecto`,
            `📋 */facts [proyecto]* — Ver info guardada`,
            ``,
            `💬 O escribime (o mandame un audio) y te respondo directamente.`,
        ].join('\n')
        await sendTelegramMessage(chatId, msg, token)
        return
    }

    if (text === '/chatid') {
        await sendTelegramMessage(chatId, `Tu Chat ID es: \`${chatId}\`\n\nAgregalo en .env.local como:\nTELEGRAM_CHAT_ID=${chatId}`, token)
    } else if (text === '/start') {
        await sendTelegramMessage(chatId, "¡Hola! Soy tu asistente de Arecco IA. Escribime, mandame un audio, o usá /ayuda para ver los comandos disponibles.", token)
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
            // Fetch live context - concurrent with memory load + knowledge base + CRM
            const crmClient = getCRMClient()
            const [recentEmails, upcomingEvents, crmContacts, memoryContext, knowledgeResults, crmSnapshot] = await Promise.all([
                fetchRecentEmails(5).catch(() => []),
                fetchGoogleCalendarEvents(5).catch(() => []),
                searchCRM(text, 3).catch(() => []),
                agentOrchestrator.loadMemory(text).catch(() => ({ coreFacts: [], recentMessages: [], semanticMatches: [], conversationSummary: undefined })),
                searchKnowledge(text, 3).catch(() => []),
                Promise.all([
                    crmClient.from('clients').select('id, status').then(r => r.data || []),
                    crmClient.from('leads').select('id, status, first_name, last_name, company').not('status', 'in', '("converted","unqualified")').limit(5).then(r => r.data || []),
                    crmClient.from('deals').select('title, value, updated_at').order('value', { ascending: false }).limit(5).then(r => r.data || []),
                    crmClient.from('projects').select('name, status').in('status', ['active', 'pending']).limit(5).then(r => r.data || []),
                ]).then(([clients, leads, deals, projects]) => ({ clients, leads, deals, projects })).catch(() => null),
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

            if (memoryContext.recentMessages?.length > 0) {
                liveContext += `\n**Conversaciones recientes (últimos mensajes):**\n`
                memoryContext.recentMessages.slice(-10).forEach((m: any) => {
                    liveContext += `[${m.role === 'user' ? 'Santi' : 'Asistente'}]: ${m.content.slice(0, 200)}\n`
                })
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

            // CRM snapshot (real business data)
            if (crmSnapshot) {
                const pipeline = crmSnapshot.deals.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0)
                liveContext += `\n**CRM del negocio (Arecco IA):**\n`
                liveContext += `- Clientes activos: ${crmSnapshot.clients.filter((c: any) => c.status === 'active').length}\n`
                liveContext += `- Leads en curso: ${crmSnapshot.leads.map((l: any) => `${l.first_name} ${l.last_name ?? ''} (${l.company ?? 'sin empresa'})`).join(', ') || 'ninguno'}\n`
                liveContext += `- Pipeline total: $${pipeline.toLocaleString()}\n`
                liveContext += `- Deals activos: ${crmSnapshot.deals.map((d: any) => d.title).join(', ') || 'ninguno'}\n`
                liveContext += `- Proyectos activos: ${crmSnapshot.projects.map((p: any) => p.name).join(', ') || 'ninguno'}\n`
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

            // Save to Supabase memory + extract facts (fire-and-forget)
            agentOrchestrator.processBackgroundTasks(text, aiResponse)
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
