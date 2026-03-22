'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Target, ChevronLeft, Building2, Mail, Phone, ArrowRight, Plus, X, ChevronRight, Check, UserX } from 'lucide-react'
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

const STATUS_NEXT: Record<string, string | null> = {
    new: 'contacted',
    contacted: 'qualified',
    qualified: 'converted',
    converted: null,
    unqualified: null,
}

const STATUS_NEXT_LABEL: Record<string, string> = {
    new: 'Marcar contactado',
    contacted: 'Calificar',
    qualified: 'Convertir',
}

const SOURCE_LABEL: Record<string, string> = {
    web: 'Web', referral: 'Referido', linkedin: 'LinkedIn',
    instagram: 'Instagram', email_campaign: 'Email',
    event: 'Evento', cold_outreach: 'Cold Outreach', other: 'Otro', manual: 'Manual',
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [updating, setUpdating] = useState<string | null>(null)
    const [showNewForm, setShowNewForm] = useState(false)

    const fetchLeads = useCallback(() => {
        const params = new URLSearchParams()
        if (search) params.set('q', search)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        setLoading(true)
        fetch(`/api/business-crm/leads?${params}`)
            .then(r => r.json())
            .then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [search, statusFilter])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    const updateStatus = async (lead: Lead, newStatus: string) => {
        setUpdating(lead.id)
        try {
            const res = await fetch(`/api/business-crm/leads/${lead.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus as Lead['status'] } : l))
            }
        } finally {
            setUpdating(null)
        }
    }

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
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                        <Target size={20} className="text-orange-400" />
                        <h1 className="text-3xl font-black text-white">Leads</h1>
                    </div>
                    <button
                        onClick={() => setShowNewForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        <Plus size={15} /> Nuevo Lead
                    </button>
                </div>
                <p className="text-slate-400 text-sm">Prospectos y embudo de conversión</p>
            </div>

            {/* New Lead Modal */}
            {showNewForm && (
                <NewLeadModal
                    onClose={() => setShowNewForm(false)}
                    onCreated={() => { setShowNewForm(false); fetchLeads() }}
                />
            )}

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
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s
                                ? 'bg-orange-600 border-orange-500 text-white'
                                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'}`}>
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
                        const nextStatus = STATUS_NEXT[lead.status]
                        const isUpdating = updating === lead.id
                        return (
                            <div key={lead.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
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
                                            {lead.company && <div className="flex items-center gap-1.5 text-slate-400 text-xs"><Building2 size={11} /> {lead.company}</div>}
                                            {lead.email && <div className="flex items-center gap-1.5 text-slate-400 text-xs"><Mail size={11} /> {lead.email}</div>}
                                            {lead.phone && <div className="flex items-center gap-1.5 text-slate-400 text-xs"><Phone size={11} /> {lead.phone}</div>}
                                        </div>
                                        {lead.notes && <p className="text-slate-500 text-xs mt-2 line-clamp-1">{lead.notes}</p>}
                                    </div>

                                    {/* Quick actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <p className="text-slate-600 text-xs">
                                            {new Date(lead.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                        </p>
                                        {nextStatus && STATUS_NEXT_LABEL[lead.status] && (
                                            <button
                                                onClick={() => updateStatus(lead, nextStatus)}
                                                disabled={isUpdating}
                                                title={STATUS_NEXT_LABEL[lead.status]}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/50 rounded-lg text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                                            >
                                                {isUpdating ? (
                                                    <span className="animate-spin text-xs">⟳</span>
                                                ) : (
                                                    <>
                                                        <ChevronRight size={12} />
                                                        {STATUS_NEXT_LABEL[lead.status]}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {lead.status === 'qualified' && (
                                            <button
                                                onClick={() => updateStatus(lead, 'converted')}
                                                disabled={isUpdating}
                                                title="Convertir a cliente"
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 rounded-lg text-xs text-violet-300 transition-colors disabled:opacity-50"
                                            >
                                                <Check size={12} /> Convertir
                                            </button>
                                        )}
                                        {lead.status !== 'unqualified' && lead.status !== 'converted' && (
                                            <button
                                                onClick={() => updateStatus(lead, 'unqualified')}
                                                disabled={isUpdating}
                                                title="No calificado"
                                                className="p-1.5 bg-slate-700/40 hover:bg-red-900/30 border border-slate-600/40 hover:border-red-500/40 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                                            >
                                                <UserX size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ first_name: '', last_name: '', company: '', email: '', phone: '', source: 'manual', notes: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.first_name.trim()) { setError('El nombre es obligatorio'); return }
        setSaving(true)
        setError('')
        try {
            const res = await fetch('/api/business-crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al crear'); return }
            onCreated()
        } catch {
            setError('Error de red')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-bold text-lg">Nuevo Lead</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
                </div>

                <form onSubmit={submit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Nombre *</label>
                            <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Juan" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Apellido</label>
                            <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="García" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Empresa</label>
                        <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                            value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Email</label>
                            <input type="email" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@acme.com" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Teléfono</label>
                            <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 11..." />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Fuente</label>
                        <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                            value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                            <option value="manual">Manual</option>
                            <option value="web">Web</option>
                            <option value="referral">Referido</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="instagram">Instagram</option>
                            <option value="email_campaign">Email Campaign</option>
                            <option value="event">Evento</option>
                            <option value="cold_outreach">Cold Outreach</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Notas</label>
                        <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500 resize-none"
                            rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contexto del prospecto..." />
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                            {saving ? 'Guardando...' : 'Crear Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
