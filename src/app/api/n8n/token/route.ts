// /api/n8n/token
// Google token proxy for n8n — n8n calls this to get a fresh access token.
// Centralizes all token refresh logic so n8n never stores tokens directly.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshGoogleToken } from '@/lib/gmail'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    // Validate shared secret between Mission Control and n8n
    const secret = req.headers.get('x-mission-secret')
    if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Get token for the configured email
        let { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .ilike('email', 'tfa.santiago.benitez@gmail.com')
            .maybeSingle()

        if (!tokenData) {
            const { data: fallback } = await supabase
                .from('google_tokens')
                .select('*')
                .limit(1)
            tokenData = fallback?.[0] ?? null
        }

        if (!tokenData) {
            return NextResponse.json({ error: 'No Google token found. Please re-authenticate.' }, { status: 404 })
        }

        // Refresh if expired or expiring within 2 minutes
        if (tokenData.expires_at < Date.now() + 120_000 && tokenData.refresh_token) {
            const refreshed = await refreshGoogleToken(tokenData.refresh_token)
            tokenData.access_token = refreshed.access_token
            await supabase
                .from('google_tokens')
                .update({
                    access_token: refreshed.access_token,
                    expires_at: Date.now() + refreshed.expires_in * 1000,
                    updated_at: new Date().toISOString(),
                })
                .eq('email', tokenData.email)
        }

        return NextResponse.json({
            access_token: tokenData.access_token,
            email: tokenData.email,
        })
    } catch (err: any) {
        console.error('[n8n/token] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
