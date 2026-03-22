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

    const prompt = `Sos el Director de Síntesis de un Consejo Asesor de IA.

Recibiste el análisis de 6 agentes especializados sobre el proyecto: "${project}"

Estos son todos sus outputs:

${combinedText}

---

Tu tarea: sintetizar todo en un único informe accionable del consejo, en español.

Reglas:
- Desduplicar: si varios agentes dicen cosas similares, unificálas en un solo ítem claro
- Rankear: los ítems de mayor impacto primero
- Ser específico: sin consejos genéricos
- Health score: evaluá la salud del proyecto de 1 (crítico) a 10 (excelente) basándote en toda la evidencia

Respondé SOLO con JSON válido en este formato exacto:
{
  "top_actions": ["acción 1", "acción 2", "acción 3", "acción 4", "acción 5"],
  "risks": ["riesgo 1", "riesgo 2", "riesgo 3"],
  "opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3"],
  "strategic_direction": "Un párrafo describiendo la dirección estratégica recomendada para el proyecto.",
  "project_health_score": 7
}

Requisitos:
- top_actions: 3-6 ítems, rankeados por impacto, cada uno accionable
- risks: 3-5 ítems, cada uno específico y etiquetado (Alta/Media/Baja)
- opportunities: 3-5 ítems, cada uno específico
- strategic_direction: 2-4 oraciones, clara y direccional
- project_health_score: entero del 1 al 10
- Solo JSON, sin texto extra, todo en español`

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
