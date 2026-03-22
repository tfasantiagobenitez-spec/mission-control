// src/app/api/cron/pipeline-review/route.ts
// Cron job: weekly pipeline deep dive every Monday at 9am ART (12:00 UTC)

import { NextRequest, NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'

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
        }).catch(err => console.error('[pipeline-review] Telegram send failed:', err))
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

function daysAgo(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function staleEmoji(days: number) {
    if (days <= 3) return '🟢'
    if (days <= 7) return '🟡'
    if (days <= 14) return '🟠'
    return '🔴'
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const crm = getCRMClient()

        const [dealsRes, stagesRes, clientsRes, leadsRes] = await Promise.all([
            crm.from('deals')
                .select('id, title, value, currency, probability, updated_at, created_at, stage_id, deal_stages(name)')
                .order('value', { ascending: false }),
            crm.from('deal_stages').select('id, name').order('order', { ascending: true }),
            crm.from('clients').select('id, status'),
            crm.from('leads').select('id, status, created_at'),
        ])

        const deals = dealsRes.data || []
        const clients = clientsRes.data || []
        const leads = leadsRes.data || []

        // Pipeline totals
        const totalPipeline = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)
        const weightedPipeline = deals.reduce((s, d) => s + (Number(d.value) || 0) * ((Number(d.probability) || 0) / 100), 0)

        // Group by stage
        type StageGroup = { name: string; deals: typeof deals; total: number }
        const byStage = new Map<string, StageGroup>()
        for (const deal of deals) {
            const stageData = deal.deal_stages as unknown as { name: string } | null
            const stageName = stageData?.name ?? 'Sin etapa'
            if (!byStage.has(stageName)) {
                byStage.set(stageName, { name: stageName, deals: [], total: 0 })
            }
            const group = byStage.get(stageName)!
            group.deals.push(deal)
            group.total += Number(deal.value) || 0
        }

        // Stale deals (>7d without update)
        const staleDeals = deals.filter(d => daysAgo(d.updated_at) > 7)
        const criticalDeals = deals.filter(d => daysAgo(d.updated_at) > 14)

        // Leads conversion funnel
        const totalLeads = leads.length
        const convertedLeads = leads.filter(l => l.status === 'converted').length
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

        // Active clients
        const activeClients = clients.filter(c => c.status === 'active').length

        const dateStr = new Date().toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long', day: 'numeric', month: 'long',
        })

        const lines: string[] = [
            `📊 <b>Revisión Semanal de Pipeline</b>`,
            `📅 ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `💰 Pipeline total: <b>$${totalPipeline.toLocaleString()}</b>`,
            `⚖️ Pipeline ponderado: <b>$${Math.round(weightedPipeline).toLocaleString()}</b>`,
            `📁 Deals activos: <b>${deals.length}</b>`,
            `🤝 Clientes activos: <b>${activeClients}</b>`,
            `🔄 Conversión leads→clientes: <b>${conversionRate}%</b> (${convertedLeads}/${totalLeads})`,
        ]

        // By stage breakdown
        if (byStage.size > 0) {
            lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
            lines.push(`🏗️ <b>Por etapa:</b>`)
            for (const [, group] of byStage) {
                const pct = totalPipeline > 0 ? Math.round((group.total / totalPipeline) * 100) : 0
                lines.push(`  • <b>${group.name}</b>: ${group.deals.length} deal${group.deals.length !== 1 ? 's' : ''} — $${group.total.toLocaleString()} (${pct}%)`)
            }
        }

        // Deals needing attention
        if (staleDeals.length > 0) {
            lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
            lines.push(`⚠️ <b>Deals sin mover (${staleDeals.length}):</b>`)
            staleDeals.slice(0, 8).forEach(d => {
                const days = daysAgo(d.updated_at)
                const emoji = staleEmoji(days)
                const stageData = d.deal_stages as unknown as { name: string } | null
                const stage = stageData?.name ?? '?'
                lines.push(`  ${emoji} ${d.title} — $${Number(d.value).toLocaleString()} — ${stage} — ${days}d sin mover`)
            })
        }

        // Critical (>14d)
        if (criticalDeals.length > 0) {
            lines.push(``, `🚨 <b>${criticalDeals.length} deal${criticalDeals.length !== 1 ? 's' : ''} sin actividad +14 días — acción urgente</b>`)
        } else if (staleDeals.length === 0) {
            lines.push(``, `🟢 <b>Pipeline al día</b> — todos los deals actualizados recientemente.`)
        }

        lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`)
        lines.push(`💡 <i>Revisá el pipeline completo en Mission Control → Business CRM → Pipeline</i>`)

        await sendTelegram(lines.join('\n'))

        return NextResponse.json({
            ok: true,
            totalPipeline,
            weightedPipeline: Math.round(weightedPipeline),
            deals: deals.length,
            staleDeals: staleDeals.length,
            criticalDeals: criticalDeals.length,
        })
    } catch (err: any) {
        console.error('[cron/pipeline-review] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
