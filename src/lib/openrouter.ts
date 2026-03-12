// [COPY-PASTE-SAFE]
// Archivo: src/lib/openrouter.ts

import { config } from './config'

// ── Types ────────────────────────────────────────────────────────────────

export interface OpenRouterModel {
    id: string
    name: string
    description?: string
    pricing: {
        prompt: string   // cost per token (string from API)
        completion: string
    }
    context_length: number
    top_provider?: {
        max_completion_tokens?: number
    }
    architecture?: {
        modality: string
        tokenizer: string
        instruct_type: string | null
    }
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ChatCompletionRequest {
    model?: string
    messages: ChatMessage[]
    temperature?: number
    max_tokens?: number
    stream?: boolean
}

export interface ChatCompletionChoice {
    index: number
    message: ChatMessage
    finish_reason: string
}

export interface ChatCompletionResponse {
    id: string
    model: string
    choices: ChatCompletionChoice[]
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

// ── Curated model list ───────────────────────────────────────────────────
// Popular models available through OpenRouter, grouped by provider

export const FEATURED_MODELS = [
    // Anthropic
    { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
    // OpenAI
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'openai/o1-preview', name: 'o1 Preview', provider: 'OpenAI' },
    // Google
    { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', provider: 'Google' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
    // Meta
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
    // Mistral
    { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral' },
    { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', provider: 'Mistral' },
    // DeepSeek
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
] as const

// ── API Client ───────────────────────────────────────────────────────────

function getHeaders() {
    return {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mission-control.openclaw.ai',
        'X-Title': 'OpenClaw Mission Control',
    }
}

/**
 * Fetch available models from OpenRouter API
 */
export async function listModels(): Promise<OpenRouterModel[]> {
    const res = await fetch(`${config.openrouter.baseUrl}/models`, {
        headers: getHeaders(),
        next: { revalidate: 3600 }, // cache for 1 hour
    })

    if (!res.ok) {
        throw new Error(`OpenRouter models API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    return data.data || []
}

/**
 * Send a chat completion request through OpenRouter
 */
export async function chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const rawModel = req.model || config.openrouter.defaultModel || 'anthropic/claude-3.5-sonnet';
    const sanitizedModel = rawModel.toString().trim().replace(/\\n|\\r/g, '').replace(/\n|\r/g, '').replace(/["']/g, '');

    console.log(`[OpenRouter] Using model: "${sanitizedModel}"`);

    const body = {
        model: sanitizedModel,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.max_tokens ?? 2048,
    }

    const res = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(`OpenRouter chat error: ${res.status} — ${errorBody}`)
    }

    return res.json()
}

/**
 * Check if OpenRouter is configured and reachable
 */
export async function checkConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!config.openrouter.apiKey) {
        return { connected: false, error: 'No API key configured' }
    }

    try {
        const res = await fetch(`${config.openrouter.baseUrl}/models`, {
            headers: getHeaders(),
        })
        return { connected: res.ok, error: res.ok ? undefined : `Status ${res.status}` }
    } catch (err: any) {
        return { connected: false, error: err.message }
    }
}
