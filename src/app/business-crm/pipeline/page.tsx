'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, ChevronLeft, Building2, ChevronLeft as ChevronLeftIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Stage = {
    id: string
    name: string
    color: string
    probability: number
    sort_order: number
}

type Deal = {
    id: string
    title: string
    value: number
    currency: string
    probability: number
    expected_close_date: string | null
    notes: string | null
    stage_id: string
    clients: { name: string } | null
    deal_stages: { name: string; color: string; sort_order: number } | null
}

function formatCurrency(value: number, currency: string) {
    return `${currency} ${value.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
}

export default function PipelinePage() {
    const [deals, setDeals] = useState<Deal[]>([])
    const [stages, setStages] = useState<Stage[]>([])
    const [loading, setLoading] = useState(true)
    const [moving, setMoving] = useState<string | null>(null)

    const fetchPipeline = () => {
        fetch('/api/business-crm/pipeline')
            .then(r => r.json())
            .then(d => {
                setDeals(d.deals || [])
                setStages(d.stages || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchPipeline() }, [])

    const moveStage = async (deal: Deal, targetStageId: string) => {
        setMoving(deal.id)
        try {
            const res = await fetch(`/api/business-crm/pipeline/${deal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage_id: targetStageId }),
            })
            if (res.ok) {
                setDeals(prev => prev.map(d =>
                    d.id === deal.id ? { ...d, stage_id: targetStageId } : d
                ))
            }
        } finally {
            setMoving(null)
        }
    }

    const totalPipeline = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    const weightedPipeline = deals.reduce((sum, d) => sum + (Number(d.value) || 0) * ((d.probability ?? 50) / 100), 0)

    // Group deals by stage
    const dealsByStage = stages.reduce((acc, s) => {
        acc[s.id] = deals.filter(d => d.stage_id === s.id)
        return acc
    }, {} as Record<string, Deal[]>)

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-8">
            <div className="mb-6">
                <Link href="/business-crm" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                    <ChevronLeft size={14} /> Business CRM
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <TrendingUp size={20} className="text-yellow-400" />
                    <h1 className="text-3xl font-black text-white">Pipeline</h1>
                </div>
                <p className="text-slate-400 text-sm">Deals y oportunidades de negocio</p>
            </div>

            {/* KPIs */}
            {!loading && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Deals</p>
                        <p className="text-2xl font-black text-white">{deals.length}</p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pipeline Bruto</p>
                        <p className="text-2xl font-black text-yellow-400">${totalPipeline.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pipeline Ponderado</p>
                        <p className="text-2xl font-black text-emerald-400">${Math.round(weightedPipeline).toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Kanban */}
            {loading ? (
                <div className="flex gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-xl h-64 animate-pulse" />
                    ))}
                </div>
            ) : stages.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay etapas configuradas en el pipeline.</p>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {stages.map(stage => {
                        const stageDeals = dealsByStage[stage.id] || []
                        const stageValue = stageDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)
                        return (
                            <div key={stage.id} className="flex-shrink-0 w-64">
                                {/* Stage header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color || '#6366f1' }} />
                                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                                            {stage.name}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500">{stageDeals.length}</span>
                                </div>

                                {stageValue > 0 && (
                                    <p className="text-xs text-slate-500 mb-3 font-medium">
                                        ${stageValue.toLocaleString()}
                                    </p>
                                )}

                                {/* Deal cards */}
                                <div className="space-y-2">
                                    {stageDeals.length === 0 ? (
                                        <div className="border border-dashed border-slate-700/50 rounded-lg p-4 text-center text-xs text-slate-600">
                                            Sin deals
                                        </div>
                                    ) : (
                                        stageDeals.map(deal => {
                                            const currentIdx = stages.findIndex(s => s.id === deal.stage_id)
                                            const prevStage = currentIdx > 0 ? stages[currentIdx - 1] : null
                                            const nextStage = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null
                                            const isMoving = moving === deal.id
                                            return (
                                                <div key={deal.id} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600/50 transition-colors">
                                                    <p className="text-white text-xs font-semibold mb-1 leading-snug">{deal.title}</p>
                                                    {deal.clients && (
                                                        <div className="flex items-center gap-1 text-slate-400 text-xs mb-2">
                                                            <Building2 size={10} />
                                                            <span className="truncate">{deal.clients.name}</span>
                                                        </div>
                                                    )}
                                                    {deal.value > 0 && (
                                                        <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
                                                            <DollarSign size={10} />
                                                            {formatCurrency(deal.value, deal.currency)}
                                                        </div>
                                                    )}
                                                    {deal.probability != null && (
                                                        <div className="mt-2">
                                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                                <span>Prob.</span>
                                                                <span>{deal.probability}%</span>
                                                            </div>
                                                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${deal.probability}%` }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {deal.expected_close_date && (
                                                        <p className="text-slate-500 text-xs mt-2">
                                                            Cierre: {new Date(deal.expected_close_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    )}
                                                    {/* Move stage buttons */}
                                                    <div className="flex gap-1 mt-2 pt-2 border-t border-slate-700/50">
                                                        {prevStage && (
                                                            <button
                                                                onClick={() => moveStage(deal, prevStage.id)}
                                                                disabled={isMoving}
                                                                title={`Mover a ${prevStage.name}`}
                                                                className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                                                            >
                                                                <ChevronLeftIcon size={10} />
                                                            </button>
                                                        )}
                                                        <span className="flex-1" />
                                                        {nextStage && (
                                                            <button
                                                                onClick={() => moveStage(deal, nextStage.id)}
                                                                disabled={isMoving}
                                                                title={`Mover a ${nextStage.name}`}
                                                                className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-yellow-900/40 hover:border-yellow-500/30 border border-transparent rounded text-xs text-slate-400 hover:text-yellow-300 transition-colors disabled:opacity-40"
                                                            >
                                                                {isMoving ? '⟳' : nextStage.name}
                                                                <ChevronRight size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
