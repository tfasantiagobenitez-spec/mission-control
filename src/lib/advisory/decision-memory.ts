// src/lib/advisory/decision-memory.ts
// Persists council decisions and recommendations to Supabase for future learning

import { createServerClient } from '../supabase/server'
import type { CouncilResult, DecisionLog } from './types'

/**
 * Log all top_actions from a council run to decisions_log.
 * Each recommendation is stored as a separate row for granular tracking.
 */
export async function logCouncilDecisions(
    result: CouncilResult,
    runId: string
): Promise<void> {
    const supabase = createServerClient()

    const rows = result.synthesis.top_actions.map(recommendation => ({
        project: result.project,
        recommendation,
        council_run_id: runId,
        created_at: result.generatedAt,
    }))

    const { error } = await supabase.from('decisions_log').insert(rows)

    if (error) {
        console.error('[advisory/decision-memory] Failed to log decisions:', error.message)
    } else {
        console.log(`[advisory/decision-memory] Logged ${rows.length} decisions for run ${runId}`)
    }
}

/**
 * Update a decision with what action was actually taken and what the outcome was.
 * Used for closing the learning loop.
 */
export async function updateDecisionOutcome(
    id: string,
    action_taken: string,
    outcome: string
): Promise<void> {
    const supabase = createServerClient()

    const { error } = await supabase
        .from('decisions_log')
        .update({ action_taken, outcome })
        .eq('id', id)

    if (error) {
        console.error('[advisory/decision-memory] Failed to update outcome:', error.message)
    }
}

/**
 * Retrieve past decisions for a project (for context and learning).
 */
export async function getPastDecisions(
    project: string,
    limit = 20
): Promise<DecisionLog[]> {
    const supabase = createServerClient()

    const { data, error } = await supabase
        .from('decisions_log')
        .select('*')
        .eq('project', project)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[advisory/decision-memory] Failed to fetch decisions:', error.message)
        return []
    }

    return (data || []) as DecisionLog[]
}

/**
 * Get all decisions that have outcomes recorded — used for pattern analysis.
 */
export async function getDecisionsWithOutcomes(project?: string): Promise<DecisionLog[]> {
    const supabase = createServerClient()

    let query = supabase
        .from('decisions_log')
        .select('*')
        .not('outcome', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)

    if (project) {
        query = query.eq('project', project)
    }

    const { data, error } = await query

    if (error) {
        console.error('[advisory/decision-memory] Failed to fetch outcomes:', error.message)
        return []
    }

    return (data || []) as DecisionLog[]
}
