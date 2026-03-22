import { NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'

export async function GET() {
    const db = getCRMClient()

    const [dealsRes, stagesRes] = await Promise.all([
        db.from('deals').select('*, clients(name), deal_stages(name, color, sort_order)').order('created_at', { ascending: false }),
        db.from('deal_stages').select('*').order('sort_order'),
    ])

    if (dealsRes.error) return NextResponse.json({ error: dealsRes.error.message }, { status: 500 })

    return NextResponse.json({
        deals: dealsRes.data || [],
        stages: stagesRes.data || [],
    })
}
