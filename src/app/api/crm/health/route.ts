import { NextResponse } from 'next/server'
import { calculateRelationshipScores } from '@/lib/crm/health'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (token !== process.env.INTERNAL_API_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        calculateRelationshipScores().catch(e =>
            console.error('[CRM Health API] Background calculation failed:', e)
        )

        return NextResponse.json({
            message: 'Score recalculation started in background',
            status: 'processing'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
