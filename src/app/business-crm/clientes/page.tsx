'use client'

import { useState, useEffect } from 'react'
import { Search, Building2, Globe, Mail, Phone, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

type Client = {
    id: string
    name: string
    industry: string | null
    size: string | null
    status: 'active' | 'inactive' | 'prospect'
    email: string | null
    phone: string | null
    website: string | null
    country: string | null
    created_at: string
}

const STATUS_COLOR: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    prospect: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const STATUS_LABEL: Record<string, string> = {
    active: 'Activo',
    prospect: 'Prospecto',
    inactive: 'Inactivo',
}

const SIZE_LABEL: Record<string, string> = {
    micro: 'Micro',
    small: 'Pequeña',
    medium: 'Mediana',
    enterprise: 'Enterprise',
}

function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981', '#ec4899']
function getColor(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return COLORS[Math.abs(h) % COLORS.length]
}

export default function ClientesPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        if (statusFilter !== 'all') params.set('status', statusFilter)

        setLoading(true)
        fetch(`/api/business-crm/clients?${params}`)
            .then(r => r.json())
            .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [search, statusFilter])

    const counts = {
        all: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        prospect: clients.filter(c => c.status === 'prospect').length,
        inactive: clients.filter(c => c.status === 'inactive').length,
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-8">
            <div className="mb-6">
                <Link href="/business-crm" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                    <ChevronLeft size={14} /> Business CRM
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <Building2 size={20} className="text-blue-400" />
                    <h1 className="text-3xl font-black text-white">Clientes</h1>
                </div>
                <p className="text-slate-400 text-sm">Empresas y cuentas de negocio</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                    <Search size={14} className="text-slate-400" />
                    <input
                        className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
                        placeholder="Buscar clientes..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    {(['all', 'active', 'prospect', 'inactive'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                statusFilter === s
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                        >
                            {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
                            <span className="ml-1.5 opacity-60">{counts[s]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 h-36 animate-pulse" />
                    ))}
                </div>
            ) : clients.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay clientes{search ? ` para "${search}"` : ''}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(c => (
                        <div key={c.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-colors">
                            <div className="flex items-start gap-3 mb-3">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                    style={{ background: getColor(c.name) }}
                                >
                                    {getInitials(c.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-sm truncate">{c.name}</h3>
                                    {c.industry && <p className="text-slate-400 text-xs truncate">{c.industry}</p>}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}>
                                    {STATUS_LABEL[c.status]}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {c.size && (
                                    <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                                        {SIZE_LABEL[c.size] ?? c.size}
                                    </span>
                                )}
                                {c.country && (
                                    <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                                        {c.country}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                {c.email && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Mail size={11} /> <span className="truncate">{c.email}</span>
                                    </div>
                                )}
                                {c.phone && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Phone size={11} /> {c.phone}
                                    </div>
                                )}
                                {c.website && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Globe size={11} />
                                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-blue-400 transition-colors">
                                            {c.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
