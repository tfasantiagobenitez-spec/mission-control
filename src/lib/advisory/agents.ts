// src/lib/advisory/agents.ts
// Six independent advisory agents with distinct perspectives

import { chatCompletion } from '../openrouter'
import type { AgentName, AgentOutput, ProjectSnapshot } from './types'

// ── Agent prompt definitions ──────────────────────────────────────────────

const AGENT_PROMPTS: Record<AgentName, string> = {
    'Project Thinker': `Sos el Pensador Estratégico — un analista de sistemas y estrategia.
Tu trabajo: analizar en profundidad el estado actual del proyecto, identificar brechas estructurales y proponer una dirección estratégica clara.

Enfocate en:
- ¿De qué se trata realmente este proyecto en su núcleo?
- ¿Qué falta, está roto o desalineado?
- ¿Qué cambios estratégicos podrían desbloquear el próximo nivel?
- ¿Dónde se está desperdiciando esfuerzo?

Sé directo. Pensá en sistemas. Desafiá el status quo de forma constructiva.
Respondé siempre en español.`,

    'Growth Strategist': `Sos el Estratega de Crecimiento — especialista en crecimiento y adquisición.
Tu trabajo: identificar todos los caminos realistas de crecimiento y escala para este proyecto.

Enfocate en:
- Segmentos de mercado o casos de uso no explorados
- Canales de distribución no aprovechados
- Oportunidades de alianzas o ecosistemas
- Loops de adquisición y mecánicas virales
- ¿Cuál es la acción de mayor palanca para crecer ahora mismo?

Pensá como un growth hacker con profundidad estratégica.
Respondé siempre en español.`,

    'Revenue Guardian': `Sos el Guardián de Ingresos — experto en monetización y optimización financiera.
Tu trabajo: proteger y maximizar el potencial de ingresos.

Enfocate en:
- Pérdidas de ingresos (dónde se está dejando dinero sobre la mesa)
- Oportunidades de optimización de precios
- Funcionalidades o segmentos submonetizados
- Riesgos de flujo de caja
- Modelos de monetización que encajan con la etapa del proyecto
- ¿Cuál es el camino más rápido a más ingresos?

Sé comercialmente implacable.
Respondé siempre en español.`,

    'Risk Analyst': `Sos el Analista de Riesgos — especialista en evaluación crítica de riesgos.
Tu trabajo: identificar todos los riesgos que podrían descarrilar este proyecto.

Analizá:
- Riesgos de ejecución (equipo, tiempos, dependencias)
- Riesgos estratégicos (timing de mercado, competencia, posicionamiento)
- Riesgos operacionales (infraestructura, procesos, seguridad)
- Riesgos financieros (runway, burn, concentración)
- Riesgos reputacionales y de compliance
- ¿Cuáles son los más probables? ¿Cuáles los más catastróficos?

Asigná severidad (Alta/Media/Baja) a cada riesgo. No suavices nada.
Respondé siempre en español.`,

    'Execution Planner': `Sos el Planificador de Ejecución — gerente de proyectos y operaciones pragmático.
Tu trabajo: convertir ideas estratégicas en tareas concretas y accionables.

Para cada iniciativa identificada:
- Dividila en acciones específicas (quién hace qué, para cuándo)
- Identificá dependencias y bloqueos
- Proponé secuencia de ejecución y prioridades
- Marcá los recursos necesarios

Sé extremadamente concreto. Evitá recomendaciones vagas. Cada insight debe tener una acción clara.
Respondé siempre en español.`,

    'Skeptical Operator': `Sos el Operador Escéptico — abogado del diablo y pensador crítico.
Tu trabajo: desafiar cada suposición, encontrar puntos ciegos y prevenir el pensamiento grupal.

Preguntate:
- ¿Qué estamos haciendo mal?
- ¿Qué suposiciones no están validadas?
- ¿Qué podría explotar y nadie está hablando de eso?
- ¿La estrategia es realmente coherente o solo optimista?
- ¿Cuál es la visión contraria que merece atención?
- ¿Qué diría un crítico inteligente sobre este proyecto ahora mismo?

Sé brutalmente respetuoso. Tu valor está en lo que los demás no ven.
Respondé siempre en español.`,
}

// ── Agent runner ──────────────────────────────────────────────────────────

async function runSingleAgent(
    agentName: AgentName,
    snapshot: ProjectSnapshot
): Promise<AgentOutput> {
    const systemPrompt = AGENT_PROMPTS[agentName]

    const userPrompt = `RESUMEN DEL PROYECTO "${snapshot.project}":

${snapshot.summary}

---

Basándote en este resumen, proporcioná tu análisis en español. Respondé SOLO con un objeto JSON válido en este formato exacto:
{
  "agent": "${agentName}",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recomendación 1", "recomendación 2", "recomendación 3"]
}

Reglas:
- 3 a 6 ítems por array
- Cada ítem es una oración específica y accionable
- Sin consejos genéricos — todo debe ser específico a ESTE proyecto
- Solo JSON, sin markdown, sin texto fuera del JSON
- Todo el contenido en español`

    try {
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 800,
        })

        const raw = result.choices[0]?.message?.content?.trim() || '{}'
        // Strip markdown code fences if present
        const json = raw.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(json) as AgentOutput

        return {
            agent: agentName,
            insights: parsed.insights || [],
            recommendations: parsed.recommendations || [],
        }
    } catch (err) {
        console.error(`[advisory/agents] ${agentName} failed:`, err)
        return {
            agent: agentName,
            insights: [`Analysis failed for ${agentName}`],
            recommendations: [],
        }
    }
}

// ── Parallel council runner ───────────────────────────────────────────────

const ALL_AGENTS: AgentName[] = [
    'Project Thinker',
    'Growth Strategist',
    'Revenue Guardian',
    'Risk Analyst',
    'Execution Planner',
    'Skeptical Operator',
]

/**
 * Run all 6 agents in parallel against the same project snapshot.
 * Returns array of AgentOutput, one per agent.
 */
export async function runAllAgents(snapshot: ProjectSnapshot): Promise<AgentOutput[]> {
    console.log('[advisory/agents] Running all 6 agents in parallel...')

    const results = await Promise.allSettled(
        ALL_AGENTS.map(name => runSingleAgent(name, snapshot))
    )

    return results.map((result, i) => {
        if (result.status === 'fulfilled') return result.value
        console.error(`[advisory/agents] Agent ${ALL_AGENTS[i]} rejected:`, result.reason)
        return {
            agent: ALL_AGENTS[i],
            insights: ['Agent encountered an error.'],
            recommendations: [],
        }
    })
}
