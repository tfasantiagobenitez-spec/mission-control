// [COPY-PASTE-SAFE]
// Archivo: src/app/api/openrouter/status/route.ts

import { NextResponse } from 'next/server'
import { checkConnection } from '@/lib/openrouter'
import { config } from '@/lib/config'

export async function GET() {
    const status = await checkConnection()

    return NextResponse.json({
        success: true,
        configured: !!config.openrouter.apiKey,
        connected: status.connected,
        defaultModel: config.openrouter.defaultModel,
        error: status.error,
    })
}
