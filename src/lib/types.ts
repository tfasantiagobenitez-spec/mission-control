// [COPY-PASTE-SAFE]
// Archivo: src/lib/types.ts

export interface Agent {
    id: string
    name: string
    display_name: string | null
    role: string
    level: number
    status: 'active' | 'idle' | 'blocked'
    default_model: string
    session_key: string
    created_at: string
    updated_at: string
}

export interface Mission {
    id: string
    title: string
    description: string | null
    status: 'approved' | 'running' | 'succeeded' | 'failed' | 'cancelled'
    priority: number
    created_by: string
    created_at: string
    started_at: string | null
    completed_at: string | null
}

export interface Proposal {
    id: string
    agent_id: string
    title: string
    description: string | null
    status: 'pending' | 'accepted' | 'rejected'
    source: 'api' | 'trigger' | 'reaction' | 'agent' | 'human'
    proposed_steps: any[] | null
    created_at: string
    reviewed_at: string | null
}

export interface AgentEvent {
    id: string
    agent_id: string
    kind: string
    title: string
    summary: string | null
    tags: string[]
    metadata: Record<string, unknown>
    created_at: string
}

// Tipo auxiliar para joins
export type MissionWithAgent = Mission & {
    agents: Agent | null
}

export type ProposalWithAgent = Proposal & {
    agents: Agent | null
}

export type EventWithAgent = AgentEvent & {
    agents: Agent | null
}
