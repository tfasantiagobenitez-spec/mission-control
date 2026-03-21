// src/lib/advisory/types.ts
// Core types for the AI Business Advisory Council system

export type AgentName =
    | 'Project Thinker'
    | 'Growth Strategist'
    | 'Revenue Guardian'
    | 'Risk Analyst'
    | 'Execution Planner'
    | 'Skeptical Operator'

export interface AgentOutput {
    agent: AgentName
    insights: string[]
    recommendations: string[]
    rawThinking?: string
}

export interface ProjectContext {
    project: string
    facts: Array<{ key: string; value: string; source?: string }>
    recent_messages: Array<{ role: string; content: string; created_at?: string }>
    knowledge: Array<{ text: string; title: string; sourceUrl: string; score: number }>
    activity_summary: string
}

export interface ProjectSnapshot {
    project: string
    summary: string
    generatedAt: string
}

export interface CouncilSynthesis {
    top_actions: string[]
    risks: string[]
    opportunities: string[]
    strategic_direction: string
    project_health_score: number
}

export interface CouncilResult {
    project: string
    snapshot: ProjectSnapshot
    agent_outputs: AgentOutput[]
    synthesis: CouncilSynthesis
    generatedAt: string
}

export interface DecisionLog {
    id?: string
    project: string
    recommendation: string
    action_taken?: string
    outcome?: string
    council_run_id?: string
    created_at?: string
}
