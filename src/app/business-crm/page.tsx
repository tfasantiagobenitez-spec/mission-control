'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users, TrendingUp, Briefcase, FolderOpen, Activity,
    ArrowRight, Building2, UserCheck, Target, Zap
} from 'lucide-react'

type Stats = {
    clients: { total: number; active: number }
    leads: { total: number; new: number }
    deals: { total: number; pipeline: number }
    projects: { total: number; active: number }
    activities: number
}

const MODULES = [
    {
        href: '/business-crm/clientes',
        label: 'Clientes',
        description: 'Empresas y cuentas activas',
        icon: Building2,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
        href: '/business-crm/contactos',
        label: 'Contactos',
        description: 'Personas y relaciones',
        icon: UserCheck,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
        href: '/business-crm/pipeline',
        label: 'Pipeline',
        description: 'Deals y oportunidades',
        icon: TrendingUp,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
    {
        href: '/business-crm/leads',
        label: 'Leads',
        description: 'Prospectos y conversión',
        icon: Target,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20',
    },
    {
        href: '/business-crm/proyectos',
        label: 'Proyectos',
        description: 'Estado y tareas activas',
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
                <h1 className="text-4xl font-black text-white mb-1">
                    Command Center CRM
                </h1>
                <p className="text-slate-400 text-sm">
                    Clientes, deals, leads y proyectos — todo en un lugar.
                </p>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 animate-pulse h-24" />
                    ))
                ) : stats ? (
                    <>
                        <StatCard label="Clientes" value={stats.clients.total} sub={`${stats.clients.active} activos`} icon={Building2} color="text-blue-400" />
                        <StatCard label="Leads" value={stats.leads.total} sub={`${stats.leads.new} nuevos`} icon={Target} color="text-orange-400" />
                        <StatCard label="Deals" value={stats.deals.total} sub={`$${stats.deals.pipeline.toLocaleString()} pipeline`} icon={TrendingUp} color="text-yellow-400" />
                        <StatCard label="Proyectos" value={stats.projects.total} sub={`${stats.projects.active} activos`} icon={FolderOpen} color="text-violet-400" />
                        <StatCard label="Actividades" value={stats.activities} sub="registradas" icon={Activity} color="text-emerald-400" />
                    </>
                ) : (
                    <div className="col-span-5 text-center py-8 text-slate-500">
                        No se pudo cargar los datos. Verificá que <code className="text-xs bg-slate-800 px-1 rounded">CRM_SUPABASE_SERVICE_ROLE_KEY</code> esté configurado.
                    </div>
                )}
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map(m => {
                    const Icon = m.icon
                    return (
                        <Link
                            key={m.href}
                            href={m.href}
                            className={`group flex items-center gap-4 p-5 rounded-xl border ${m.bg} hover:scale-[1.02] transition-all duration-200`}
                        >
                            <div className={`p-3 rounded-lg bg-slate-900/60`}>
                                <Icon size={22} className={m.color} />
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-semibold text-sm">{m.label}</p>
                                <p className="text-slate-400 text-xs mt-0.5">{m.description}</p>
                            </div>
                            <ArrowRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </Link>
                    )
                })}

                {/* Advisory Council link */}
                <Link
                    href="/agents/advisory-council"
                    className="group flex items-center gap-4 p-5 rounded-xl border bg-violet-600/10 border-violet-500/20 hover:scale-[1.02] transition-all duration-200"
                >
                    <div className="p-3 rounded-lg bg-slate-900/60">
                        <Zap size={22} className="text-violet-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-semibold text-sm">AI Advisory Council</p>
                        <p className="text-slate-400 text-xs mt-0.5">Analiza tus proyectos con IA</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
            </div>
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
