import { createClient } from '@supabase/supabase-js'
import { listGmailMessages, getGmailMessage, refreshGoogleToken } from '@/lib/gmail'

export async function fetchRecentEmails(limit: number = 5) {
    const targetEmail = 'sbenitez@areccoia.com'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        let { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle()

        if (!tokenData) {
            const { data: allTokens } = await supabase.from('google_tokens').select('*').limit(1)
            if (allTokens && allTokens.length > 0) {
                tokenData = allTokens[0]
            }
        }

        if (!tokenData) return []

        let accessToken = tokenData.access_token

        // Check if expired (with 1 min buffer)
        if (tokenData.expires_at < Date.now() + 60000 && tokenData.refresh_token) {
            const newTokens = await refreshGoogleToken(tokenData.refresh_token)
            accessToken = newTokens.access_token

            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expires_at: Date.now() + (newTokens.expires_in * 1000),
                updated_at: new Date().toISOString()
            }).eq('email', targetEmail)
        }

        // Fetch just the few most recent for LLM context
        const msgList = await listGmailMessages(accessToken, limit)

        const fullMessages = await Promise.all(
            msgList.map((m: any) => getGmailMessage(accessToken, m.id).catch(e => null))
        )

        const validMessages = fullMessages.filter(m => m !== null)

        return validMessages.map(msg => ({
            subject: msg.subject,
            sender: msg.from,
            date: msg.date,
            snippet: msg.snippet
        }))

    } catch (error) {
        console.error("Error fetching recent emails for context:", error)
        return []
    }
}
