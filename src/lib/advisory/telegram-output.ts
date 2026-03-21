// src/lib/advisory/telegram-output.ts
// Formats and sends the council report to Telegram

import type { CouncilResult } from './types'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

/**
 * Format the council result into a Telegram message.
 * Telegram supports MarkdownV2 — we use HTML mode for simplicity.
 */
export function formatCouncilMessage(result: CouncilResult): string {
    const { project, synthesis, snapshot } = result
    const score = synthesis.project_health_score

    // Health score emoji
    const scoreEmoji = score >= 8 ? '🟢' : score >= 5 ? '🟡' : '🔴'

    const topActions = synthesis.top_actions
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n')

    const risks = synthesis.risks
        .map(r => `• ${r}`)
        .join('\n')

    const opportunities = synthesis.opportunities
        .map(o => `• ${o}`)
        .join('\n')

    const date = new Date(result.generatedAt).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'short',
        timeStyle: 'short',
    })

    return [
        `🧠 <b>AI Advisory Council — ${project}</b>`,
        `📅 ${date}`,
        ``,
        `📌 <b>Top Actions:</b>`,
        topActions,
        ``,
        `⚠️ <b>Risks:</b>`,
        risks,
        ``,
        `🚀 <b>Opportunities:</b>`,
        opportunities,
        ``,
        `🧭 <b>Strategic Direction:</b>`,
        synthesis.strategic_direction,
        ``,
        `${scoreEmoji} <b>Health Score: ${score}/10</b>`,
    ].join('\n')
}

/**
 * Send the council report to Telegram.
 * Splits into multiple messages if the text exceeds Telegram's 4096 char limit.
 */
export async function sendCouncilToTelegram(result: CouncilResult): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID) {
        console.warn('[advisory/telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID')
        return
    }

    const message = formatCouncilMessage(result)

    // Telegram max message length is 4096 chars
    const chunks = splitMessage(message, 4096)

    for (const chunk of chunks) {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: chunk,
                parse_mode: 'HTML',
            }),
        })

        if (!res.ok) {
            const err = await res.text()
            console.error('[advisory/telegram] Send failed:', err)
        }
    }
}

/**
 * Also send individual agent outputs as a follow-up (optional, verbose mode).
 */
export async function sendAgentDetailsToTelegram(result: CouncilResult): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID) return

    const agentEmojis: Record<string, string> = {
        'Project Thinker': '🔭',
        'Growth Strategist': '📈',
        'Revenue Guardian': '💰',
        'Risk Analyst': '🛡️',
        'Execution Planner': '⚙️',
        'Skeptical Operator': '🤔',
    }

    for (const agent of result.agent_outputs) {
        const emoji = agentEmojis[agent.agent] || '🤖'
        const insights = agent.insights.map(i => `  • ${i}`).join('\n')
        const recs = agent.recommendations.map(r => `  → ${r}`).join('\n')

        const msg = [
            `${emoji} <b>${agent.agent}</b>`,
            ``,
            `<b>Insights:</b>`,
            insights,
            ``,
            `<b>Recommendations:</b>`,
            recs,
        ].join('\n')

        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: msg.slice(0, 4096),
                parse_mode: 'HTML',
            }),
        })

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300))
    }
}

function splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text]

    const chunks: string[] = []
    const lines = text.split('\n')
    let current = ''

    for (const line of lines) {
        if ((current + '\n' + line).length > maxLength) {
            if (current) chunks.push(current.trim())
            current = line
        } else {
            current = current ? current + '\n' + line : line
        }
    }

    if (current.trim()) chunks.push(current.trim())
    return chunks
}
