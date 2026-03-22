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

export async function POST(req: Request) {
    const body = await req.json()
    const { first_name, last_name, company, email, phone, source, notes } = body

    if (!first_name) {
        return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
    }

    const crm = getCRMClient()
    const { data, error } = await crm
        .from('leads')
        .insert({
            first_name: first_name.trim(),
            last_name: last_name?.trim() || null,
            company: company?.trim() || null,
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            source: source || 'manual',
            notes: notes?.trim() || null,
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, lead: data }, { status: 201 })
}
