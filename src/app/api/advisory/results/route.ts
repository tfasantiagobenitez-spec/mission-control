// src/app/api/advisory/results/route.ts
// Returns the last council result + decision history for a project

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { CouncilResult, DecisionLog } from '@/lib/advisory/types'

/**
 * GET /api/advisory/results?project=Arecco+IA
 * Returns last council result + recent decisions for a project.
 */
export async function GET(req: NextRequest) {
    const project = req.nextUrl.searchParams.get('project') || 'General'
    const supabase = createServerClient()

    const storeKey = `advisory_last_run_${project.toLowerCase().replace(/\s+/g, '_')}`

    const [storeResult, decisionsResult] = await Promise.all([
        supabase
            .from('data_store')
            .select('value, updated_at')
            .eq('key', storeKey)
            .single(),

        supabase
            .from('decisions_log')
            .select('*')
            .eq('project', project)
            .order('created_at', { ascending: false })
            .limit(30),
    ])

    let lastRun: CouncilResult | null = null
    if (storeResult.data?.value) {
        try {
            lastRun = JSON.parse(storeResult.data.value) as CouncilResult
        } catch {
            lastRun = null
        }
    }

    return NextResponse.json({
        project,
        last_run: lastRun,
        decisions: (decisionsResult.data || []) as DecisionLog[],
        last_updated: storeResult.data?.updated_at || null,
    })
}

/**
 * GET /api/advisory/results/projects
 * Returns all projects that have had a council run.
 */
export async function POST(req: NextRequest) {
    // POST used as a namespace for listing projects
    const supabase = createServerClient()

    const { data } = await supabase
        .from('data_store')
        .select('key, updated_at')
        .like('key', 'advisory_last_run_%')
        .order('updated_at', { ascending: false })

    const projects = (data || []).map(row => ({
        key: row.key,
        project: row.key.replace('advisory_last_run_', '').replace(/_/g, ' '),
        last_updated: row.updated_at,
    }))

    return NextResponse.json({ projects })
}
