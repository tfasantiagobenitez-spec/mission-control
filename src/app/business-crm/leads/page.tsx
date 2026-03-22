'use client'

import { useState, useEffect } from 'react'
import { Search, Target, ChevronLeft, Building2, Mail, Phone, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type Lead = {
    id: string
    first_name: string
    last_name: string | null
    company: string | null
    email: string | null
    phone: string | null
    source: string | null
    status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
    notes: string | null
    created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    new: { label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    contacted: { label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    qualified: { label: 'Calificado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    unqualified: { label: 'No calificado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    converted: { label: 'Convertido', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
}

const SOURCE_LABEL: Record<string, string> = {
    web: 'Web',
    referral: 'Referido',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    email_campaign: 'Email',
    event: 'Evento',
    cold_outreach: 'Cold Outreach',
    other: 'Otro',
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        if (statusFilter !== 'all') params.set('status', statusFilter)

        setLoading(true)
        fetch(`/api/business-crm/leads?${params}`)
            .then(r => r.json())
            .then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [search, statusFilter])

    const statusTabs = ['all', 'new', 'contacted', 'qualified', 'unqualified', 'converted']
    const counts = statusTabs.reduce((acc, s) => {
        acc[s] = s === 'all' ? leads.length : leads.filter(l => l.status === s).length
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-8">
            <div className="mb-6">
                <Link href="/business-crm" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                    <ChevronLeft size={14} /> Business CRM
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <Target size={20} className="text-orange-400" />
                    <h1 className="text-3xl font-black text-white">Leads</h1>
                </div>
                <p className="text-slate-400 text-sm">Prospectos y embudo de conversión</p>
            </div>

            {/* Conversion Funnel mini */}
            {!loading && leads.length > 0 && (
                <div className="flex items-center gap-2 mb-6 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-x-auto">
                    {['new', 'contacted', 'qualified', 'converted'].map((s, i, arr) => (
                        <div key={s} className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-center">
                                <p className="text-lg font-black text-white">{counts[s]}</p>
                                <p className="text-xs text-slate-500">{STATUS_CONFIG[s]?.label}</p>
                            </div>
                            {i < arr.length - 1 && <ArrowRight size={14} className="text-slate-600" />}
                        </div>
                    ))}
                    {counts.all > 0 && (
                        <div className="ml-auto text-right flex-shrink-0">
                            <p className="text-lg font-black text-violet-400">
                                {Math.round((counts.converted / counts.all) * 100)}%
                            </p>
                            <p className="text-xs text-slate-500">conversión</p>
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                    <Search size={14} className="text-slate-400" />
                    <input
                        className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
                        placeholder="Buscar leads..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {statusTabs.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                statusFilter === s
                                    ? 'bg-orange-600 border-orange-500 text-white'
                                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                        >
                            {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label}
                            <span className="ml-1.5 opacity-60">{counts[s]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl h-20 animate-pulse" />
                    ))}
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Target size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay leads{search ? ` para "${search}"` : ''}.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map(lead => {
                        const status = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
                        return (
                            <div key={lead.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-white font-semibold text-sm">
                                                {lead.first_name} {lead.last_name}
                                            </h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
                                                {status.label}
                                            </span>
                                            {lead.source && (
                                                <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">
                                                    {SOURCE_LABEL[lead.source] ?? lead.source}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {lead.company && (
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                    <Building2 size={11} /> {lead.company}
                                                </div>
                                            )}
                                            {lead.email && (
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                    <Mail size={11} /> {lead.email}
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                    <Phone size={11} /> {lead.phone}
                                                </div>
                                            )}
                                        </div>
                                        {lead.notes && (
                                            <p className="text-slate-500 text-xs mt-2 line-clamp-1">{lead.notes}</p>
                                        )}
                                    </div>
                                    <p className="text-slate-600 text-xs flex-shrink-0">
                                        {new Date(lead.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
