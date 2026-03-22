// src/lib/advisory/run-council.ts
// Council Orchestrator: the main entry point for the advisory system

import { randomUUID } from 'crypto'
import { buildProjectContext, summarizeContext } from './context-builder'
import { runAllAgents } from './agents'
import { synthesizeCouncilOutputs } from './synthesizer'
import { sendCouncilToTelegram } from './telegram-output'
import { logCouncilDecisions } from './decision-memory'
import { createServerClient } from '../supabase/server'
import type { CouncilResult } from './types'

export interface RunCouncilOptions {
    /** Name or identifier of the project to analyze */
    project: string
    /** Send result to Telegram (default: true) */
    sendToTelegram?: boolean
    /** Persist decisions to decisions_log (default: true) */
    logDecisions?: boolean
    /** Log verbose agent details to console (default: false) */
    verbose?: boolean
}

/**
 * Main orchestrator: runs the full AI Advisory Council pipeline.
 *
 * Flow:
 * 1. Build unified project context (Supabase + Pinecone)
 * 2. Generate compressed PROJECT SNAPSHOT via LLM
 * 3. Run all 6 agents in parallel against the snapshot
 * 4. Synthesize agent outputs into ranked council report
 * 5. Send report to Telegram
 * 6. Persist decisions to decisions_log
 *
 * Returns the full CouncilResult for programmatic use.
 */
async function sendTelegramError(project: string, err: unknown) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return
    const msg = `❌ <b>Advisory falló para "${project}"</b>\n${String(err).slice(0, 300)}`
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
    }).catch(() => {})
}

export async function runCouncil(options: RunCouncilOptions): Promise<CouncilResult> {
    const {
        project,
        sendToTelegram = true,
        logDecisions = true,
        verbose = false,
    } = options

    const runId = randomUUID()
    const startTime = Date.now()

    console.log(`[advisory/council] ── Starting council run ${runId} for project: "${project}" ──`)

    try {

    // Step 1: Build context (sin Pinecone para evitar timeout)
    console.log('[advisory/council] Step 1/4: Building project context...')
    const context = await buildProjectContext(project)

    if (verbose) {
        console.log(`[advisory/council] Facts loaded: ${context.facts.length}`)
        console.log(`[advisory/council] Messages loaded: ${context.recent_messages.length}`)
        console.log(`[advisory/council] Knowledge results: ${context.knowledge.length}`)
    }

    // Step 2: Generate snapshot
    console.log('[advisory/council] Step 2/4: Generating project snapshot...')
    const snapshot = await summarizeContext(context)

    if (verbose) {
        console.log('[advisory/council] Snapshot:\n', snapshot.summary)
    }

    // Step 3: Run all agents in parallel
    console.log('[advisory/council] Step 3/4: Running 6 agents in parallel...')
    const agentOutputs = await runAllAgents(snapshot)

    if (verbose) {
        agentOutputs.forEach(a => {
            console.log(`[advisory/council] ${a.agent}: ${a.insights.length} insights, ${a.recommendations.length} recs`)
        })
    }

    // Step 4: Synthesize
    console.log('[advisory/council] Step 4/4: Synthesizing council outputs...')
    const synthesis = await synthesizeCouncilOutputs(project, agentOutputs)

    const result: CouncilResult = {
        project,
        snapshot,
        agent_outputs: agentOutputs,
        synthesis,
        generatedAt: new Date().toISOString(),
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[advisory/council] ── Council complete in ${elapsed}s. Health score: ${synthesis.project_health_score}/10 ──`)

    // Step 5 (optional): Send to Telegram
    if (sendToTelegram) {
        console.log('[advisory/council] Sending report to Telegram...')
        await sendCouncilToTelegram(result).catch(err => {
            console.error('[advisory/council] Telegram send failed:', err)
        })
    }

    // Step 6 (optional): Persist decisions
    if (logDecisions) {
        console.log('[advisory/council] Logging decisions to Supabase...')
        await logCouncilDecisions(result, runId).catch(err => {
            console.error('[advisory/council] Decision logging failed:', err)
        })
    }

    // Always persist full result to data_store for UI retrieval
    const supabase = createServerClient()
    const storeKey = `advisory_last_run_${project.toLowerCase().replace(/\s+/g, '_')}`
    const { error: storeError } = await supabase.from('data_store').upsert({
        key: storeKey,
        value: JSON.stringify(result),
        data_type: 'json',
        updated_at: new Date().toISOString(),
    })
    if (storeError) console.error('[advisory/council] data_store persist failed:', storeError)

    return result

    } catch (err) {
        console.error('[advisory/council] Fatal error:', err)
        await sendTelegramError(project, err)
        throw err
    }
}
