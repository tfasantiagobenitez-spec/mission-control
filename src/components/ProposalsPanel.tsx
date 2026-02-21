// [COPY-PASTE-SAFE]
// Archivo: src/components/ProposalsPanel.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProposalWithAgent } from '@/lib/types'
import { Check, X, Clock, User, Terminal, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function ProposalsPanel() {
    const [proposals, setProposals] = useState<ProposalWithAgent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchProposals() {
            const { data, error } = await supabase
                .from('proposals')
                .select('*, agents(*)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10)

            if (!error && data) {
                setProposals(data as ProposalWithAgent[])
            }
            setLoading(false)
        }

        fetchProposals()

        const channel = supabase
            .channel('proposals_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'proposals' },
                () => fetchProposals()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function handleDecision(proposalId: string, decision: 'approved' | 'rejected') {
        const supabase = createClient()

        const { error } = await supabase.rpc('approve_proposal', {
            p_proposal_id: proposalId,
            p_decision: decision,
            p_reason: decision === 'rejected' ? 'Rechazada manualmente desde el dashboard' : null
        })

        if (error) {
            console.error('Error al procesar propuesta:', error)
            alert('Error al procesar la propuesta: ' + error.message)
        }
    }

    if (loading) {
        return (
            <div className="p-12 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
                ))}
            </div>
        )
    }

    if (proposals.length === 0) {
        return (
            <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Todo en orden</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No hay propuestas pendientes de revisión</p>
            </div>
        )
    }

    return (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {proposals.map((proposal) => (
                <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onDecision={handleDecision}
                />
            ))}
        </div>
    )
}

function ProposalCard({
    proposal,
    onDecision
}: {
    proposal: ProposalWithAgent
    onDecision: (id: string, decision: 'approved' | 'rejected') => void
}) {
    const stepsCount = Array.isArray(proposal.proposed_steps) ? proposal.proposed_steps.length : 0

    return (
        <div className="p-8 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
                            Propuesta Nueva
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-tighter">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: es })}
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {proposal.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {proposal.description || 'Sin descripción detallada disponible.'}
                    </p>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <Badge icon={<User className="w-3.5 h-3.5" />} text={proposal.agents?.display_name || proposal.agents?.name || 'Desconocido'} />
                        <Badge icon={<Terminal className="w-3.5 h-3.5" />} text={`${stepsCount} Pasos planeados`} />
                        <Badge icon={<Info className="w-3.5 h-3.5" />} text={proposal.agents?.default_model || 'Modelo estándar'} />
                    </div>
                </div>

                <div className="flex flex-col justify-center gap-3 min-w-[160px]">
                    <button
                        onClick={() => onDecision(proposal.id, 'approved')}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        <Check className="w-4 h-4" />
                        Autorizar
                    </button>
                    <button
                        onClick={() => onDecision(proposal.id, 'rejected')}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                    >
                        <X className="w-4 h-4" />
                        Denegar
                    </button>
                </div>
            </div>
        </div>
    )
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 text-xs font-bold tracking-tight">
            {icon}
            {text}
        </div>
    )
}
