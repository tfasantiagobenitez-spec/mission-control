import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

export async function calculateRelationshipScores() {
    console.log('[CRM] Calculating relationship scores...')

    const { data: contacts } = await supabase
        .from('crm_contacts')
        .select(`
            id,
            last_interaction_at,
            crm_interactions (count)
        `)

    if (!contacts) return

    for (const contact of contacts) {
        let score = 50 // Base score

        // Bonus for interaction frequency
        const interactionCount = (contact.crm_interactions as any)?.[0]?.count || 0
        score += Math.min(interactionCount * 5, 30)

        // Penalty for staleness (e.g., -1 point for every 3 days without contact)
        if (contact.last_interaction_at) {
            const daysSince = Math.floor((Date.now() - new Date(contact.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
            score -= Math.floor(daysSince / 3)
        }

        // Clamp 0-100
        score = Math.max(0, Math.min(100, score))

        await supabase
            .from('crm_contacts')
            .update({ relationship_score: score })
            .eq('id', contact.id)
    }

    console.log('[CRM] Relationship scores updated.')
}
