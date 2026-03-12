import { NextResponse } from 'next/server'
import { syncContactsFromGmail } from '@/lib/crm/sync'

export async function GET(req: Request) {
    // Basic auth check using internal token
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (token !== process.env.INTERNAL_API_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Run sync in background so request doesn't timeout
        syncContactsFromGmail().catch(e => console.error('[CRM API] Background sync failed:', e))

        return NextResponse.json({
            message: 'Sync started in background',
            status: 'processing'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
