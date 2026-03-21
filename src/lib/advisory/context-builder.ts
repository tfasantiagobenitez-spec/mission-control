// src/lib/advisory/context-builder.ts
// Context Engine: builds a unified project snapshot from all data sources

import { createServerClient } from '../supabase/server'
import { searchKnowledge } from '../knowledge/search'
import { chatCompletion } from '../openrouter'
import type { ProjectContext, ProjectSnapshot } from './types'

/**
 * Build a unified project context by pulling from:
 * - Supabase conversation_facts (user facts)
 * - Supabase conversation_messages (recent chat history)
 * - Pinecone knowledge base (semantic search)
 */
export async function buildProjectContext(project: string): Promise<ProjectContext> {
    const supabase = createServerClient()

    // Fetch facts, messages, and knowledge in parallel
    const [factsResult, messagesResult, knowledgeResults] = await Promise.all([
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
    ])

    const facts = factsResult.data || []
    const messages = (messagesResult.data || []).reverse() // chronological order

    // Build a short activity summary from recent activity_log
    const { data: activityData } = await supabase
        .from('activity_log')
        .select('action, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

    const activity_summary = (activityData || [])
        .map((a: { action: string; metadata?: Record<string, unknown>; created_at: string }) => {
            const meta = a.metadata ? ` (${JSON.stringify(a.metadata).slice(0, 80)})` : ''
            return `• ${a.action}${meta}`
        })
        .join('\n') || 'No recent activity recorded.'

    return {
        project,
        facts,
        recent_messages: messages,
        knowledge: knowledgeResults.map(k => ({
            text: k.text,
            title: k.title,
            sourceUrl: k.sourceUrl,
            score: k.score,
        })),
        activity_summary,
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

    const prompt = `You are a senior business analyst. Synthesize the following project data into a concise PROJECT SNAPSHOT (max 400 words) that captures the current state, key facts, recent activity, and open questions for the project "${context.project}".

=== KNOWN FACTS ===
${factsBlock}

=== RECENT CONVERSATIONS (last 15 messages) ===
${messagesBlock}

=== KNOWLEDGE BASE (top results) ===
${knowledgeBlock}

=== RECENT ACTIVITY ===
${context.activity_summary}

Write a dense, structured snapshot. Include: current project status, key challenges, recent decisions, open priorities. Be specific and direct. No filler.`

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
