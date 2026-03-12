// [COPY-PASTE-SAFE]
// Archivo: src/app/api/openrouter/chat/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion, ChatMessage } from '@/lib/openrouter'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
    if (!config.openrouter.apiKey) {
        return NextResponse.json(
            { success: false, error: 'OpenRouter API key not configured' },
            { status: 400 }
        )
    }

    try {
        const body = await request.json()
        const { model, messages, temperature, max_tokens } = body as {
            model?: string
            messages: ChatMessage[]
            temperature?: number
            max_tokens?: number
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Messages array is required' },
                { status: 400 }
            )
        }

        const result = await chatCompletion({
            model: model || config.openrouter.defaultModel,
            messages,
            temperature,
            max_tokens,
        })

        return NextResponse.json({
            success: true,
            ...result,
        })
    } catch (error: any) {
        console.error('OpenRouter chat error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
