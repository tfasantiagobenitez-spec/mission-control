// src/app/api/cron/advisory/route.ts
// Cron job: run AI Advisory Council daily at 8am Argentina time
// Schedule: 11:30 UTC = 08:30 ART (runs 30min after digest)

import { NextRequest, NextResponse } from 'next/server'
import { runCouncil } from '@/lib/advisory/run-council'

export const maxDuration = 60

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        console.log('[cron/advisory] Starting scheduled advisory council run...')

        const result = await runCouncil({
            project: 'Arecco IA',
            sendToTelegram: true,
            logDecisions: true,
            verbose: false,
        })

        console.log(`[cron/advisory] Done. Health score: ${result.synthesis.project_health_score}/10`)

        return NextResponse.json({
            ok: true,
            health_score: result.synthesis.project_health_score,
            top_actions: result.synthesis.top_actions,
            generatedAt: result.generatedAt,
        })
    } catch (err: any) {
        console.error('[cron/advisory] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
