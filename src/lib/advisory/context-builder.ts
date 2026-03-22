// src/lib/advisory/context-builder.ts
// Context Engine: builds a unified project snapshot from all data sources

import { createServerClient } from '../supabase/server'
import { getCRMClient } from '../crm/business-client'
import { searchKnowledge } from '../knowledge/search'
import { chatCompletion } from '../openrouter'
import type { ProjectContext, ProjectSnapshot } from './types'

/**
 * Fetch live CRM data to enrich advisory context
 */
async function fetchCRMData() {
    try {
        const db = getCRMClient()
        const [clients, deals, leads, projects, activities] = await Promise.all([
            db.from('clients').select('name, status, industry').eq('status', 'active').limit(20),
            db.from('deals').select('title, value, currency, probability, deal_stages(name)').limit(20),
            db.from('leads').select('first_name, last_name, company, status, source').limit(20),
            db.from('projects').select('name, status, description').limit(20),
            db.from('activities').select('activity_type, title, occurred_at').order('occurred_at', { ascending: false }).limit(15),
        ])

        const activeClients = (clients.data || []).map(c => `${c.name} (${c.industry ?? 'sin industria'})`)
        const pipelineDeals = (deals.data || []).map(d => {
            const stageData = d.deal_stages as unknown as { name: string } | null
            const stage = stageData?.name ?? 'sin etapa'
            return `${d.title}: $${d.value} ${d.currency} — ${d.probability}% prob — ${stage}`
        })
        const recentLeads = (leads.data || []).map(l => `${l.first_name} ${l.last_name ?? ''} (${l.company ?? 'sin empresa'}) — ${l.status} via ${l.source}`)
        const activeProjects = (projects.data || []).filter(p => p.status !== 'completed').map(p => `${p.name}: ${p.description?.slice(0, 100) ?? 'sin descripción'}`)
        const recentActivities = (activities.data || []).map(a => `${a.activity_type}: ${a.title}`)

        return {
            activeClients,
            pipelineDeals,
            recentLeads,
            activeProjects,
            recentActivities,
        }
    } catch {
        return null
    }
}

/**
 * Build a unified project context by pulling from:
 * - Supabase conversation_facts (user facts)
 * - Supabase conversation_messages (recent chat history)
 * - Pinecone knowledge base (semantic search)
 * - Business CRM (clients, deals, leads, projects)
 */
export async function buildProjectContext(project: string): Promise<ProjectContext> {
    const supabase = createServerClient()

    // Fetch facts, messages, knowledge and CRM data in parallel
    const [factsResult, messagesResult, knowledgeResults, crmData] = await Promise.all([
        supabase
            .from('conversation_facts')
            .select('key, value, source')
            .order('updated_at', { ascending: false })
            .limit(50),

        supabase
            .from('conversation_messages')
            .select('role, content, created_at')
            .order('created_at', { ascending: false })
            .limit(30),

        searchKnowledge(`${project} strategy growth risks revenue`, 8).catch(() => []),

        fetchCRMData(),
    ])

    const facts = factsResult.data || []
    const messages = (messagesResult.data || []).reverse()

    // Build activity summary from activity_log + CRM activities
    const { data: activityData } = await supabase
        .from('activity_log')
        .select('action, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

    const mcActivity = (activityData || [])
        .map((a: { action: string; metadata?: Record<string, unknown>; created_at: string }) => {
            const meta = a.metadata ? ` (${JSON.stringify(a.metadata).slice(0, 80)})` : ''
            return `• ${a.action}${meta}`
        })
        .join('\n') || 'No recent activity recorded.'

    // Append CRM summary to facts
    const enrichedFacts = [...facts]
    if (crmData) {
        if (crmData.activeClients.length > 0) {
            enrichedFacts.push({ key: 'CRM_active_clients', value: crmData.activeClients.join('; '), source: 'crm' })
        }
        if (crmData.pipelineDeals.length > 0) {
            enrichedFacts.push({ key: 'CRM_pipeline_deals', value: crmData.pipelineDeals.join(' | '), source: 'crm' })
        }
        if (crmData.recentLeads.length > 0) {
            enrichedFacts.push({ key: 'CRM_recent_leads', value: crmData.recentLeads.slice(0, 8).join('; '), source: 'crm' })
        }
        if (crmData.activeProjects.length > 0) {
            enrichedFacts.push({ key: 'CRM_active_projects', value: crmData.activeProjects.join(' | '), source: 'crm' })
        }
    }

    const crmActivityBlock = crmData?.recentActivities.length
        ? '\n\n=== CRM ACTIVITIES ===\n' + crmData.recentActivities.map(a => `• ${a}`).join('\n')
        : ''

    return {
        project,
        facts: enrichedFacts,
        recent_messages: messages,
        knowledge: knowledgeResults.map(k => ({
            text: k.text,
            title: k.title,
            sourceUrl: k.sourceUrl,
            score: k.score,
        })),
        activity_summary: mcActivity + crmActivityBlock,
    }
}

/**
 * Compress a full ProjectContext into a concise PROJECT SNAPSHOT string
 * that all agents will receive as their shared input.
 */
export async function summarizeContext(context: ProjectContext): Promise<ProjectSnapshot> {
    const factsBlock = context.facts
        .slice(0, 20)
        .map(f => `- ${f.key}: ${f.value}`)
        .join('\n') || 'No facts available.'

    const messagesBlock = context.recent_messages
        .slice(-15)
        .map(m => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 200)}`)
        .join('\n') || 'No recent messages.'

    const knowledgeBlock = context.knowledge
        .slice(0, 5)
        .map(k => `• ${k.title || k.sourceUrl}: ${k.text.slice(0, 300)}`)
        .join('\n') || 'No knowledge base entries.'

    const prompt = `Sos un analista de negocios senior. Sintetizá los siguientes datos del proyecto en un RESUMEN EJECUTIVO conciso (máx 400 palabras) que capture el estado actual, hechos clave, actividad reciente y preguntas abiertas del proyecto "${context.project}". Respondé siempre en español.

=== HECHOS CONOCIDOS ===
${factsBlock}

=== CONVERSACIONES RECIENTES (últimos 15 mensajes) ===
${messagesBlock}

=== BASE DE CONOCIMIENTO (resultados principales) ===
${knowledgeBlock}

=== ACTIVIDAD RECIENTE ===
${context.activity_summary}

Escribí un resumen denso y estructurado en español. Incluí: estado actual del proyecto, desafíos clave, decisiones recientes, prioridades abiertas. Sé específico y directo. Sin relleno.`

    const result = await chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
    })

    const summary = result.choices[0]?.message?.content?.trim() || 'Unable to generate snapshot.'

    return {
        project: context.project,
        summary,
        generatedAt: new Date().toISOString(),
    }
}
