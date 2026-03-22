import { NextResponse } from 'next/server'
import { getCRMClient, CRM_CONFIGURED } from '@/lib/crm/business-client'

export async function GET() {
    const db = getCRMClient()

    const { data, error, count } = await db
        .from('contacts')
        .select('id, first_name', { count: 'exact' })
        .limit(3)

    return NextResponse.json({
        service_key_configured: CRM_CONFIGURED,
        contacts_count: count,
        contacts_sample: data,
        error: error?.message ?? null,
    })
}
