// src/app/api/cron/daily-digest/route.ts
// Cron job: send daily business digest to Telegram at 8am Argentina time
// Schedule: 11:00 UTC = 08:00 ART (UTC-3)

import { NextRequest, NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'
import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 30

async function sendTelegram(text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return

    const chunks = splitMessage(text, 4096)
    for (const chunk of chunks) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: 'HTML' }),
        }).catch(err => console.error('[digest] Telegram send failed:', err))
    }
}

function splitMessage(text: string, max: number): string[] {
    if (text.length <= max) return [text]
    const chunks: string[] = []
    const lines = text.split('\n')
    let current = ''
    for (const line of lines) {
        if ((current + '\n' + line).length > max) {
            if (current) chunks.push(current.trim())
            current = line
        } else {
            current = current ? current + '\n' + line : line
        }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
}

export async function GET(req: NextRequest) {
    // Vercel cron sends this header — verify it to prevent unauthorized calls
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const crm = getCRMClient()
        const mc = createServerClient()

        const [
            clientsRes, leadsRes, dealsRes, projectsRes,
            activitiesRes, messagesRes, myRemindersRes, waitingRemindersRes,
        ] = await Promise.all([
            crm.from('clients').select('id, status'),
            crm.from('leads').select('id, status, first_name, last_name, company, created_at'),
            crm.from('deals').select('id, value, currency, title, updated_at, deal_stages(name)'),
            crm.from('projects').select('id, name, status, updated_at'),
            crm.from('activities').select('activity_type, title, occurred_at').order('occurred_at', { ascending: false }).limit(5),
            mc.from('conversation_messages').select('id', { count: 'exact', head: true }),
            mc.from('crm_reminders').select('id, text, meeting_id, status').eq('owner', 'mine').eq('status', 'pending_approval').order('id', { ascending: false }).limit(10),
            mc.from('crm_reminders').select('id, text, meeting_id').eq('owner', 'theirs').eq('status', 'waiting_on').order('id', { ascending: false }).limit(10),
        ])

        const clients = clientsRes.data || []
        const leads = leadsRes.data || []
        const deals = dealsRes.data || []
        const projects = projectsRes.data || []
        const activities = activitiesRes.data || []
        const myReminders = myRemindersRes.data || []
        const waitingReminders = waitingRemindersRes.data || []

        const pipeline = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)
        const activeClients = clients.filter(c => c.status === 'active').length
        const activeLeads = leads.filter(l => !['converted', 'unqualified'].includes(l.status))

        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const staleLeads = activeLeads.filter(l => l.created_at < threeDaysAgo)
        const staleDeals = deals.filter(d => d.updated_at < sevenDaysAgo)
        const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'pending')
        const staleProjects = activeProjects.filter(p => p.updated_at < sevenDaysAgo)

        const now = new Date()
        const dateStr = now.toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long', day: 'numeric', month: 'long',
        })

        // Health indicator
        const totalAlerts = staleLeads.length + staleDeals.length + staleProjects.length + myReminders.length
        const healthEmoji = totalAlerts === 0 ? '🟢' : totalAlerts <= 3 ? '🟡' : '🔴'

        const lines: string[] = [
            `☀️ <b>Buenos días, Santi — Resumen del negocio</b>`,
            `📅 ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `📊 <b>KPIs de hoy</b>`,
            `💰 Pipeline total: <b>$${pipeline.toLocaleString()}</b>`,
            `🤝 Clientes activos: <b>${activeClients}</b>`,
            `🎯 Leads en curso: <b>${activeLeads.length}</b>`,
            `📁 Proyectos activos: <b>${activeProjects.length}</b>`,
            `💬 Mensajes IA totales: <b>${(messagesRes.count ?? 0).toLocaleString()}</b>`,
        ]

        // Alerts section
        if (totalAlerts > 0) {
            lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
            lines.push(`${healthEmoji} <b>Requieren atención (${totalAlerts})</b>`)

            if (staleLeads.length > 0) {
                lines.push(``, `🎯 <b>Leads sin contactar +3 días:</b>`)
                staleLeads.slice(0, 5).forEach(l => {
                    const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000)
                    const name = `${l.first_name} ${l.last_name ?? ''}`.trim()
                    lines.push(`  • ${name}${l.company ? ` (${l.company})` : ''} — ${days}d`)
                })
            }

            if (staleDeals.length > 0) {
                lines.push(``, `📈 <b>Deals sin mover +7 días:</b>`)
                staleDeals.slice(0, 5).forEach(d => {
                    const days = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)
                    lines.push(`  • ${d.title} — $${Number(d.value).toLocaleString()} — ${days}d`)
                })
            }

            if (staleProjects.length > 0) {
                lines.push(``, `📁 <b>Proyectos sin actividad +7 días:</b>`)
                staleProjects.slice(0, 3).forEach(p => {
                    const days = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000)
                    lines.push(`  • ${p.name} — ${days}d`)
                })
            }
        } else {
            lines.push(``, `🟢 <b>Todo al día</b> — sin alertas pendientes.`)
        }

        // Action items from Fireflies meetings
        if (myReminders.length > 0) {
            lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
            lines.push(`📋 <b>Tus pendientes de reuniones (${myReminders.length})</b>`)
            myReminders.forEach((r, i) => {
                lines.push(`  ${i + 1}. ${r.text}`)
            })
        }

        if (waitingReminders.length > 0) {
            lines.push(``, `⏳ <b>Esperando respuesta de otros (${waitingReminders.length})</b>`)
            waitingReminders.slice(0, 5).forEach(r => {
                lines.push(`  • ${r.text}`)
            })
        }

        // Recent CRM activity
        if (activities.length > 0) {
            lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
            lines.push(`⚡ <b>Actividad reciente en CRM</b>`)
            activities.forEach(a => {
                lines.push(`  • ${a.activity_type}: ${a.title}`)
            })
        }

        lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
        lines.push(`🧠 <i>Tip: corré el Advisory Council para un análisis estratégico completo.</i>`)

        await sendTelegram(lines.join('\n'))

        return NextResponse.json({ ok: true, alertsCount: totalAlerts })
    } catch (err: any) {
        console.error('[cron/daily-digest] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
