import { NextResponse } from 'next/server'
import { syncContactsFromFireflies } from '@/lib/crm/fireflies'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (token !== process.env.INTERNAL_API_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        syncContactsFromFireflies().catch(e =>
            console.error('[CRM Fireflies API] Background sync failed:', e)
        )

        return NextResponse.json({
            message: 'Fireflies sync started in background',
            status: 'processing'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
