// PATCH /api/business-crm/leads/[id]
// Quick actions: update lead status, notes

import { NextRequest, NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const allowed = ['status', 'notes', 'first_name', 'last_name', 'company', 'email', 'phone']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
        if (body[key] !== undefined) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    update.updated_at = new Date().toISOString()

    const crm = getCRMClient()
    const { data, error } = await crm
        .from('leads')
        .update(update)
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, lead: data })
}
