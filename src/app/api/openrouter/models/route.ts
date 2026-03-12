// [COPY-PASTE-SAFE]
// Archivo: src/app/api/openrouter/models/route.ts

import { NextResponse } from 'next/server'
import { listModels, FEATURED_MODELS } from '@/lib/openrouter'
import { config } from '@/lib/config'

export async function GET() {
    if (!config.openrouter.apiKey) {
        return NextResponse.json(
            { success: false, error: 'OpenRouter API key not configured' },
            { status: 400 }
        )
    }

    try {
        const allModels = await listModels()

        // Filter to featured models with pricing info
        const featuredIds = new Set(FEATURED_MODELS.map(m => m.id))
        const enriched = FEATURED_MODELS.map(featured => {
            const full = allModels.find(m => m.id === featured.id)
            return {
                id: featured.id,
                name: featured.name,
                provider: featured.provider,
                context_length: full?.context_length || 0,
                pricing: full?.pricing || { prompt: '0', completion: '0' },
            }
        })

        return NextResponse.json({
            success: true,
            defaultModel: config.openrouter.defaultModel,
            models: enriched,
            totalAvailable: allModels.length,
        })
    } catch (error: any) {
        console.error('OpenRouter models error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
