import { NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q') || ''
    const status = searchParams.get('status') || ''

    const db = getCRMClient()
    let query = db.from('leads').select('*').order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)
    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data, error } = await query.limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
