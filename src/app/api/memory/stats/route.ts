import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = createServerClient()

        const [
            factsResult,
            messagesResult,
            activityResult,
            recentFactsResult,
        ] = await Promise.all([
            supabase.from('conversation_facts').select('key, value, source, updated_at', { count: 'exact' }).order('updated_at', { ascending: false }).limit(50),
            supabase.from('conversation_messages').select('role, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(1),
            supabase.from('activity_log').select('action, details, status, created_at').order('created_at', { ascending: false }).limit(10),
            supabase.from('conversation_facts').select('key, value, source, updated_at').order('updated_at', { ascending: false }).limit(8),
        ])

        // Count messages total via count
        const { count: messageCount } = await supabase
            .from('conversation_messages')
            .select('*', { count: 'exact', head: true })

        const { count: factsCount } = await supabase
            .from('conversation_facts')
            .select('*', { count: 'exact', head: true })

        // Last message timestamp
        const lastMessage = messagesResult.data?.[0]

        return NextResponse.json({
            stats: {
                totalFacts: factsCount || 0,
                totalMessages: messageCount || 0,
                lastActivity: activityResult.data?.[0]?.created_at || null,
            },
            recentFacts: recentFactsResult.data || [],
            recentActivity: activityResult.data || [],
            lastMessage,
        })
    } catch (error: any) {
        console.error('[memory/stats] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
