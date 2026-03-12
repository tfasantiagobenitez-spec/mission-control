import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGmailReply, refreshGoogleToken } from '@/lib/gmail'
import fs from 'fs'

const logPath = 'C:\\Users\\benit\\.gemini\\antigravity\\email-agent.log'

function log(msg: string) {
    const entry = `[${new Date().toISOString()}] REPLAY_API: ${msg}\n`
    console.log(entry.trim())
    try {
        fs.appendFileSync(logPath, entry)
    } catch (e) { }
}

export async function POST(request: Request) {
    const clickupToken = process.env.CLICKUP_API_TOKEN
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        const body = await request.json()
        const { taskId, replyContent } = body

        log(`Attempting reply for: ${taskId}`)

        if (!taskId || !replyContent) {
            log(`Error: Missing taskId or replyContent`)
            return NextResponse.json({ error: 'Missing taskId or replyContent' }, { status: 400 })
        }

        // 1. Check if it's a Gmail reply (prefixed with msg: in our frontend)
        if (taskId.startsWith('msg:')) {
            const gmailMsgId = taskId.replace('msg:', '')

            // Get tokens to send
            const { data: tokenData } = await supabase
                .from('google_tokens')
                .select('*')
                .limit(1)
                .single()

            if (!tokenData) throw new Error('No Google tokens found for reply')

            let accessToken = tokenData.access_token
            // Refresh if needed
            if (Date.now() > new Date(tokenData.expires_at).getTime()) {
                const refreshed = await refreshGoogleToken(tokenData.refresh_token)
                accessToken = refreshed.access_token
                await supabase.from('google_tokens').update({
                    access_token: accessToken,
                    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
                }).eq('id', tokenData.id)
            }

            // We need threadId and original message details. 
            // For now, we assume frontend passed threadId or we fetch it.
            // Simplified: Fetch message details from Gmail to get threadId and headers
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMsgId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            const msgData = await res.json()
            const threadId = msgData.threadId
            const headers = msgData.payload.headers
            const to = headers.find((h: any) => h.name === 'From')?.value || ''
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'Re: Email'
            const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || ''

            await sendGmailReply(accessToken, threadId, to, subject, replyContent, messageId)
            log(`Gmail reply sent successfully to ${to}`)
            return NextResponse.json({ success: true, provider: 'gmail' })
        }

        // 2. Fallback to ClickUp
        if (!clickupToken) {
            return NextResponse.json({ error: 'ClickUp token missing' }, { status: 500 })
        }

        const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
            method: 'POST',
            headers: {
                Authorization: clickupToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                comment_text: replyContent,
                notify_all: true
            })
        })

        if (!response.ok) {
            const errData = await response.json()
            log(`ClickUp Error: ${JSON.stringify(errData)}`)
            throw new Error('Failed to post comment to ClickUp')
        }

        log(`ClickUp reply posted successfully`)
        return NextResponse.json({ success: true, provider: 'clickup' })
    } catch (error: any) {
        log(`Error in Email Reply API: ${error.message}`)
        return NextResponse.json({ error: error.message || 'Failed to send reply' }, { status: 500 })
    }
}
