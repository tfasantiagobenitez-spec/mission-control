// src/app/api/advisory/trigger/route.ts
// Internal UI trigger — no external token needed (same-origin only)
// Used by the Advisory Council page in Mission Control

import { NextRequest, NextResponse } from 'next/server'
import { runCouncil } from '@/lib/advisory/run-council'

export const maxDuration = 60 // allow up to 60s for full council run

export async function POST(req: NextRequest) {
    try {
        const { project } = await req.json()

        if (!project || typeof project !== 'string') {
            return NextResponse.json({ error: 'Missing project name' }, { status: 400 })
        }

        const result = await runCouncil({
            project: project.trim(),
            sendToTelegram: true,
            logDecisions: true,
        })

        return NextResponse.json({
            success: true,
            project: result.project,
            health_score: result.synthesis.project_health_score,
            top_actions: result.synthesis.top_actions,
            generatedAt: result.generatedAt,
        })
    } catch (err: any) {
        console.error('[api/advisory/trigger] Error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
