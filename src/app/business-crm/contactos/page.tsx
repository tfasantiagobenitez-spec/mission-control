'use client'

import { useState, useEffect } from 'react'
import { Search, UserCheck, ChevronLeft, Building2, Mail, Linkedin, Briefcase } from 'lucide-react'
import Link from 'next/link'

type Contact = {
    id: string
    first_name: string
    last_name: string | null
    company: string | null
    role_function: string | null
    email: string | null
    phone: string | null
    linkedin: string | null
    source: string | null
    created_at: string
    clients: { name: string } | null
}

const COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981', '#ec4899']
function getColor(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return COLORS[Math.abs(h) % COLORS.length]
}
function getInitials(first: string, last?: string | null) {
    return `${first[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

export default function ContactosPage() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams()
        if (search) params.set('q', search)

        setLoading(true)
        setError(null)
        fetch(`/api/business-crm/contacts?${params}`)
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d)) {
                    setContacts(d)
                } else if (d?.error) {
                    setError(d.error)
                    setContacts([])
                } else {
                    setContacts([])
                }
                setLoading(false)
            })
            .catch(e => { setError(String(e)); setLoading(false) })
    }, [search])

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-8">
            <div className="mb-6">
                <Link href="/business-crm" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                    <ChevronLeft size={14} /> Business CRM
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <UserCheck size={20} className="text-emerald-400" />
                    <h1 className="text-3xl font-black text-white">Contactos</h1>
                </div>
                <p className="text-slate-400 text-sm">{contacts.length} personas registradas</p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 mb-6 max-w-md">
                <Search size={14} className="text-slate-400" />
                <input
                    className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
                    placeholder="Buscar por nombre, empresa o email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl h-28 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <UserCheck size={40} className="mx-auto mb-3 opacity-30 text-red-400" />
                    <p className="text-red-400 text-sm font-medium mb-1">Error al cargar contactos</p>
                    <p className="text-slate-500 text-xs font-mono max-w-lg mx-auto">{error}</p>
                </div>
            ) : contacts.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay contactos{search ? ` para "${search}"` : ''} en el CRM.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts.map(c => (
                        <div key={c.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                    style={{ background: getColor(c.first_name + (c.last_name ?? '')) }}
                                >
                                    {getInitials(c.first_name, c.last_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-sm">
                                        {c.first_name} {c.last_name}
                                    </h3>
                                    {c.role_function && (
                                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                                            <Briefcase size={10} /> {c.role_function}
                                        </div>
                                    )}
                                    {(c.company || c.clients?.name) && (
                                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                                            <Building2 size={10} /> {c.company || c.clients?.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                {c.email && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Mail size={11} /> <span className="truncate">{c.email}</span>
                                    </div>
                                )}
                                {c.linkedin && (
                                    <a
                                        href={c.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <Linkedin size={11} /> LinkedIn
                                    </a>
                                )}
                            </div>

                            {c.source && (
                                <span className="inline-block mt-2 text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">
                                    {c.source}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
