'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Target, Building2, UserCheck, TrendingUp, FolderOpen,
    Activity, ArrowRight, Briefcase, Zap
} from 'lucide-react'

type Stats = {
    clients: { total: number; active: number }
    leads: { total: number; new: number }
    deals: { total: number; pipeline: number }
    projects: { total: number; active: number }
    activities: number
}

const FUNNEL = [
    {
        step: '01',
        href: '/business-crm/leads',
        label: 'Leads',
        description: 'Prospectos entrantes',
        icon: Target,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20',
    },
    {
        step: '02',
        href: '/business-crm/clientes',
        label: 'Clientes',
        description: 'Lead calificado → cuenta',
        icon: Building2,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
        step: '03',
        href: '/business-crm/contactos',
        label: 'Contactos',
        description: 'Personas del cliente',
        icon: UserCheck,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
        step: '04',
        href: '/business-crm/pipeline',
        label: 'Pipeline',
        description: 'Deals y oportunidades',
        icon: TrendingUp,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
    {
        step: '05',
        href: '/business-crm/proyectos',
        label: 'Proyectos',
        description: 'Deal ganado → ejecución',
        icon: FolderOpen,
        color: 'text-violet-400',
        bg: 'bg-violet-500/10 border-violet-500/20',
    },
]

export default function BusinessCRMPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/business-crm/stats')
            .then(r => r.json())
            .then(d => { setStats(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest mb-2">
                    <Briefcase size={12} />
                    BUSINESS CRM
                </div>
                <h1 className="text-4xl font-black text-white mb-1">Command Center CRM</h1>
                <p className="text-slate-400 text-sm">Lead → Cliente → Deal → Proyecto</p>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 animate-pulse h-24" />
                    ))
                ) : stats ? (
                    <>
                        <StatCard label="Leads" value={stats.leads.total} sub={`${stats.leads.new} nuevos`} icon={Target} color="text-orange-400" />
                        <StatCard label="Clientes" value={stats.clients.total} sub={`${stats.clients.active} activos`} icon={Building2} color="text-blue-400" />
                        <StatCard label="Deals" value={stats.deals.total} sub={`$${stats.deals.pipeline.toLocaleString()} pipeline`} icon={TrendingUp} color="text-yellow-400" />
                        <StatCard label="Proyectos" value={stats.projects.total} sub={`${stats.projects.active} activos`} icon={FolderOpen} color="text-violet-400" />
                        <StatCard label="Actividades" value={stats.activities} sub="registradas" icon={Activity} color="text-emerald-400" />
                    </>
                ) : (
                    <div className="col-span-5 text-center py-8 text-slate-500">
                        No se pudo cargar los datos.
                    </div>
                )}
            </div>

            {/* Funnel Flow */}
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Flujo de trabajo</p>
            <div className="flex flex-col lg:flex-row gap-2 mb-8">
                {FUNNEL.map((m, i) => {
                    const Icon = m.icon
                    return (
                        <div key={m.href} className="flex items-center gap-2 flex-1">
                            <Link
                                href={m.href}
                                className={`group flex items-center gap-3 p-4 rounded-xl border flex-1 ${m.bg} hover:scale-[1.02] transition-all duration-200`}
                            >
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                    <span className="text-xs font-black text-slate-600">{m.step}</span>
                                    <Icon size={18} className={m.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm">{m.label}</p>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-snug">{m.description}</p>
                                </div>
                            </Link>
                            {i < FUNNEL.length - 1 && (
                                <ArrowRight size={14} className="text-slate-600 flex-shrink-0 hidden lg:block" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Advisory link */}
            <Link
                href="/agents/advisory-council"
                className="group flex items-center gap-4 p-5 rounded-xl border bg-violet-600/10 border-violet-500/20 hover:scale-[1.01] transition-all duration-200"
            >
                <Zap size={20} className="text-violet-400 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-white font-semibold text-sm">AI Advisory Council</p>
                    <p className="text-slate-400 text-xs mt-0.5">Analiza tus proyectos y clientes con IA — recomendaciones estratégicas en tiempo real</p>
                </div>
                <ArrowRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
        </div>
    )
}

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: number; sub: string; icon: React.ElementType; color: string
}) {
    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={color} />
                <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-black text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        </div>
    )
}
