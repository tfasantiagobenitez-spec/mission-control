import { NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'

export async function GET() {
    const db = getCRMClient()

    const { data, error } = await db
        .from('projects')
        .select('*, clients(name), tasks(id, status, title, deadline)')
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
