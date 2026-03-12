// [COPY-PASTE-SAFE]
// Archivo: src/lib/config.ts

import path from 'node:path'

const OPENCLAW_HOME = process.env.OPENCLAW_HOME
    || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.openclaw') : '/tmp/.openclaw')

export const config = {
    supabase: {
        url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/["']/g, ''),
        anonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/["']/g, ''),
        serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/["']/g, ''),
    },
    openclaw: {
        home: OPENCLAW_HOME,
        outputsRoot: process.env.OUTPUTS_ROOT
            || path.join(OPENCLAW_HOME, 'workspace', '07_OUTPUTS'),
    },
    api: {
        internalToken: (process.env.INTERNAL_API_TOKEN || '').trim().replace(/["']/g, ''),
    },
    openrouter: {
        apiKey: (process.env.OPENROUTER_API_KEY || '').trim().replace(/["']/g, ''),
        // Hardcoded to ensure stability after regression
        defaultModel: 'anthropic/claude-3.5-sonnet',
        baseUrl: 'https://openrouter.ai/api/v1',
    },
} as const

// Validar que variables críticas existan
if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error('Missing Supabase environment variables')
}
