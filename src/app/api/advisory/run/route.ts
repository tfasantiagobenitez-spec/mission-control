// src/app/api/advisory/run/route.ts
// API endpoint to trigger the AI Advisory Council

import { NextRequest, NextResponse } from 'next/server'
import { runCouncil } from '@/lib/advisory/run-council'

export const maxDuration = 60 // Vercel Pro: up to 300s. Hobby: up to 60s.

/**
 * POST /api/advisory/run
 *
 * Body:
 * {
 *   project: string           // required — project name to analyze
 *   sendToTelegram?: boolean  // default: true
 *   logDecisions?: boolean    // default: true
 *   verbose?: boolean         // default: false
 * }
 *
 * Returns: CouncilResult
 *
 * Authentication: requires INTERNAL_API_TOKEN header
 * Header: Authorization: Bearer <INTERNAL_API_TOKEN>
 */
export async function POST(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.INTERNAL_API_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { project, sendToTelegram = true, logDecisions = true, verbose = false } = body

        if (!project || typeof project !== 'string') {
            return NextResponse.json(
                { error: 'Missing required field: project (string)' },
                { status: 400 }
            )
        }

        console.log(`[api/advisory/run] Council triggered for project: "${project}"`)

        const result = await runCouncil({
            project: project.trim(),
            sendToTelegram,
            logDecisions,
            verbose,
        })

        return NextResponse.json({
            success: true,
            project: result.project,
            health_score: result.synthesis.project_health_score,
            top_actions: result.synthesis.top_actions,
            generatedAt: result.generatedAt,
            // Full result available for consumers that need it
            result,
        })
    } catch (err: any) {
        console.error('[api/advisory/run] Error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/advisory/run
 * Health check
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'AI Advisory Council',
        usage: 'POST with { project: string }',
    })
}
