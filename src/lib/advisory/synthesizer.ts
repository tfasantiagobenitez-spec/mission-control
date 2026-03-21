// src/lib/advisory/synthesizer.ts
// Combines all agent outputs into a single, ranked, deduplicated synthesis

import { chatCompletion } from '../openrouter'
import type { AgentOutput, CouncilSynthesis } from './types'

/**
 * Synthesize outputs from all 6 agents into a single structured report.
 * Uses LLM to deduplicate, rank, and extract the most important items.
 */
export async function synthesizeCouncilOutputs(
    project: string,
    agentOutputs: AgentOutput[]
): Promise<CouncilSynthesis> {
    // Build a combined view of all agent outputs
    const combinedText = agentOutputs
        .map(a => {
            const insights = a.insights.map(i => `  • ${i}`).join('\n')
            const recs = a.recommendations.map(r => `  → ${r}`).join('\n')
            return `[${a.agent.toUpperCase()}]\nInsights:\n${insights}\nRecommendations:\n${recs}`
        })
        .join('\n\n---\n\n')

    const prompt = `You are the Chief Synthesis Officer of an AI Advisory Council.

You have received analysis from 6 specialized agents about the project: "${project}"

Here are all their outputs:

${combinedText}

---

Your task: synthesize everything into a single, actionable council report.

Rules:
- Deduplicate: if multiple agents say similar things, merge them into one clear item
- Rank: put the highest-impact items first
- Be specific: no generic advice
- Health score: rate project health from 1 (critical) to 10 (excellent) based on all evidence

Respond ONLY with valid JSON in this exact format:
{
  "top_actions": ["action 1", "action 2", "action 3", "action 4", "action 5"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "strategic_direction": "One paragraph describing the recommended strategic direction for the project.",
  "project_health_score": 7
}

Requirements:
- top_actions: 3-6 items, ranked by impact, each actionable
- risks: 3-5 items, each specific and labeled (High/Medium/Low)
- opportunities: 3-5 items, each specific
- strategic_direction: 2-4 sentences, clear and directional
- project_health_score: integer 1-10
- JSON only, no extra text`

    try {
        const result = await chatCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 1000,
        })

        const raw = result.choices[0]?.message?.content?.trim() || '{}'
        const json = raw.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(json) as CouncilSynthesis

        return {
            top_actions: parsed.top_actions || [],
            risks: parsed.risks || [],
            opportunities: parsed.opportunities || [],
            strategic_direction: parsed.strategic_direction || 'No strategic direction generated.',
            project_health_score: Math.min(10, Math.max(1, parsed.project_health_score || 5)),
        }
    } catch (err) {
        console.error('[advisory/synthesizer] Synthesis failed:', err)

        // Fallback: extract items directly from agent outputs without LLM
        const allRecs = agentOutputs.flatMap(a => a.recommendations)
        const riskAgent = agentOutputs.find(a => a.agent === 'Risk Analyst')
        const growthAgent = agentOutputs.find(a => a.agent === 'Growth Strategist')

        return {
            top_actions: allRecs.slice(0, 5),
            risks: riskAgent?.insights.slice(0, 3) || [],
            opportunities: growthAgent?.recommendations.slice(0, 3) || [],
            strategic_direction: 'Synthesis failed — see individual agent outputs.',
            project_health_score: 5,
        }
    }
}
