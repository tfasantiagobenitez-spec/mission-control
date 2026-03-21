// src/lib/advisory/agents.ts
// Six independent advisory agents with distinct perspectives

import { chatCompletion } from '../openrouter'
import type { AgentName, AgentOutput, ProjectSnapshot } from './types'

// ── Agent prompt definitions ──────────────────────────────────────────────

const AGENT_PROMPTS: Record<AgentName, string> = {
    'Project Thinker': `You are the Project Thinker — a strategic systems analyst.
Your job: deeply analyze the current state of the project, identify structural gaps, and propose clear strategic direction.

Focus on:
- What is the project really about at its core?
- What is missing, broken, or misaligned?
- What strategic shifts could unlock the next level?
- Where is effort being wasted?

Be direct. Think in systems. Challenge the status quo constructively.`,

    'Growth Strategist': `You are the Growth Strategist — a growth and acquisition specialist.
Your job: identify every realistic path to growth and scale for this project.

Focus on:
- Untapped market segments or use cases
- Distribution channels not being leveraged
- Partnership or ecosystem opportunities
- Acquisition loops and viral mechanics
- What is the single highest-leverage growth action right now?

Think like a growth hacker with strategic depth.`,

    'Revenue Guardian': `You are the Revenue Guardian — a monetization and financial optimization expert.
Your job: protect and maximize revenue potential.

Focus on:
- Revenue leaks (where money is being left on the table)
- Pricing optimization opportunities
- Undermonetized features or user segments
- Cash flow risks
- Monetization models that fit this project's stage
- What is the fastest path to more revenue?

Be commercially ruthless.`,

    'Risk Analyst': `You are the Risk Analyst — a critical risk assessment specialist.
Your job: surface every risk that could derail this project.

Analyze:
- Execution risks (team, timeline, dependencies)
- Strategic risks (market timing, competition, positioning)
- Operational risks (infrastructure, process, security)
- Financial risks (runway, burn, concentration)
- Reputational and compliance risks
- Which risks are most likely? Which are most catastrophic?

Assign severity (High/Medium/Low) to each risk. Do not sugarcoat.`,

    'Execution Planner': `You are the Execution Planner — a pragmatic project and operations manager.
Your job: convert strategic ideas into concrete, actionable tasks.

For each major initiative identified:
- Break it into specific next actions (who does what, by when)
- Identify dependencies and blockers
- Propose execution sequence and priorities
- Flag resource requirements

Be extremely concrete. Avoid vague recommendations. Every insight should have a clear action attached.`,

    'Skeptical Operator': `You are the Skeptical Operator — a devil's advocate and critical thinker.
Your job: challenge every assumption, find blind spots, and prevent groupthink.

Ask:
- What are we getting wrong here?
- What assumptions are unvalidated?
- What could blow up that no one is talking about?
- Is the strategy actually coherent or just optimistic?
- What is the contrarian view that deserves airtime?
- What would a smart critic say about this project right now?

Be respectfully brutal. Your value is in what others miss.`,
}

// ── Agent runner ──────────────────────────────────────────────────────────

async function runSingleAgent(
    agentName: AgentName,
    snapshot: ProjectSnapshot
): Promise<AgentOutput> {
    const systemPrompt = AGENT_PROMPTS[agentName]

    const userPrompt = `PROJECT SNAPSHOT for "${snapshot.project}":

${snapshot.summary}

---

Based on this snapshot, provide your analysis. Respond ONLY with a valid JSON object in this exact format:
{
  "agent": "${agentName}",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Rules:
- 3 to 6 items per array
- Each item is a single, specific, actionable sentence
- No generic advice — everything must be specific to THIS project
- JSON only, no markdown, no explanation outside the JSON`

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
