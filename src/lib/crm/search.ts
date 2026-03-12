import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

export async function searchCRM(query: string, limit: number = 5) {
    // 1. Generate embedding for query (using OpenRouter or OpenAI)
    // For now, using a placeholder until embedding utility is verified
    // In a real environment, we'd call openai.embeddings.create

    // Fallback: semantic keyword search if embedding is not yet available
    const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .or(`full_name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
        .order('relationship_score', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[CRM Search] Error:', error)
        return []
    }

    return data
}

export async function getContactSummary(email: string) {
    const { data: contact } = await supabase
        .from('crm_contacts')
        .select(`
            *,
            crm_interactions (*)
        `)
        .eq('email', email)
        .order('date', { foreignTable: 'crm_interactions', ascending: false })
        .maybeSingle()

    return contact
}
