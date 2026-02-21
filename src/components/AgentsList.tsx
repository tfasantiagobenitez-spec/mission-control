// [COPY-PASTE-SAFE]
// Archivo: src/components/AgentsList.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Agent } from '@/lib/types'
import { Cpu, ShieldCheck, Zap, AlertCircle } from 'lucide-react'

export function AgentsList() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchAgents() {
            const { data, error } = await supabase
                .from('agents')
                .select('*')
                .order('created_at', { ascending: false })

            if (!error && data) {
                setAgents(data)
            }
            setLoading(false)
        }

        fetchAgents()

        const channel = supabase
            .channel('agents_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agents' },
                () => fetchAgents()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center gap-4 text-slate-400">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold animate-pulse">Analizando flota...</p>
            </div>
        )
    }

    return (
        <div className="bg-white/40 dark:bg-slate-900/40 divide-y divide-slate-200 dark:divide-slate-800 rounded-[2.5rem] overflow-hidden">
            {agents.map((agent) => (
                <AgentRow key={agent.id} agent={agent} />
            ))}
            {agents.length === 0 && (
                <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay agentes registrados</p>
                </div>
            )}
        </div>
    )
}

function AgentRow({ agent }: { agent: Agent }) {
    const statusConfig = {
        active: { color: 'text-green-500', bg: 'bg-green-500/10', icon: Zap, label: 'En Línea' },
        idle: { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Cpu, label: 'Reposo' },
        blocked: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle, label: 'Bloqueado' },
    }

    const config = statusConfig[agent.status as keyof typeof statusConfig] || statusConfig.idle
    const StatusIcon = config.icon

    return (
        <div className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
                        <StatusIcon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight">
                            {agent.display_name || agent.name}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                            {agent.role || 'Agente de Sistema'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.color} border border-current/10`}>
                        {config.label}
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-slate-400 tracking-tighter">
                        LEVEL {agent.level} • {agent.default_model}
                    </p>
                </div>
            </div>
        </div>
    )
}
