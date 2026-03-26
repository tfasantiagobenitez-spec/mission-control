// n8n-dispatcher.ts
// Dispatches structured actions to n8n for execution.
// Mission Control writes the job to Supabase and fires the n8n webhook.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ParsedAction {
    type:
        | 'GMAIL_SEND'
        | 'GMAIL_REPLY'
        | 'CALENDAR_CREATE'
        | 'CALENDAR_UPDATE'
        | 'DRIVE_UPLOAD'
        | 'DRIVE_SEARCH'
    params: Record<string, any>
}

export interface DispatchContext {
    chatId: number
    action: ParsedAction
    telegramFileId?: string   // if the message had a document/photo attached
    followUpEmail?: {          // if the file should be emailed after upload
        to: string
        subject: string
        body: string
    }
}

export function extractAction(claudeResponse: string): ParsedAction | null {
    const match = claudeResponse.match(/```action\n([\s\S]*?)\n```/)
    if (!match) return null
    try {
        const parsed = JSON.parse(match[1])
        if (!parsed.type || !parsed.params) return null
        return parsed as ParsedAction
    } catch {
        return null
    }
}

export function stripActionBlock(claudeResponse: string): string {
    return claudeResponse.replace(/```action\n[\s\S]*?\n```/, '').trim()
}

export async function dispatchToN8n(ctx: DispatchContext): Promise<string | null> {
    const n8nUrl = process.env.N8N_WEBHOOK_URL
    const secret = process.env.N8N_WEBHOOK_SECRET

    if (!n8nUrl || !secret) {
        console.error('[n8n-dispatcher] N8N_WEBHOOK_URL or N8N_WEBHOOK_SECRET not configured')
        return null
    }

    // Write job to Supabase so the callback knows where to send the result
    const { data: job, error } = await supabase
        .from('n8n_jobs')
        .insert({
            chat_id: ctx.chatId,
            action_type: ctx.action.type,
            action_params: ctx.action.params,
            status: 'pending',
        })
        .select('id')
        .single()

    if (error || !job) {
        console.error('[n8n-dispatcher] Failed to create job:', error?.message)
        return null
    }

    const payload = {
        job_id: job.id,
        chat_id: ctx.chatId,
        action: ctx.action,
        telegram_file_id: ctx.telegramFileId,
        follow_up_email: ctx.followUpEmail,
    }

    // Fire-and-forget: n8n calls back to /api/n8n/callback when done
    fetch(n8nUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mission-secret': secret,
        },
        body: JSON.stringify(payload),
    }).catch(err => console.error('[n8n-dispatcher] Webhook POST error:', err))

    return job.id
}
