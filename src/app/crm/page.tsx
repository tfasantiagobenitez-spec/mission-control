'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
    Search, RefreshCw, CalculatorIcon, X, Mail, Calendar,
    Building2, Clock, Activity, Mic, Plus, Check, AlarmClock,
    Briefcase, MessageSquare, Sparkles
} from 'lucide-react'
import './crm.css'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Contact = {
    id: string
    email: string
    full_name: string
    company: string | null
    role: string | null
    how_i_know: string | null
    relationship_score: number
    last_interaction_at: string | null
    notes: string | null
}

type Interaction = {
    id: string
    contact_id: string
    type: 'email' | 'calendar' | 'meeting' | 'manual'
    summary: string | null
    date: string
    external_id: string | null
}

type Reminder = {
    id: string
    contact_id: string
    text: string
    source: 'manual' | 'fireflies'
    status: 'pending' | 'done' | 'snoozed'
    due_date: string | null
    snoozed_until: string | null
    created_at: string
}

type FilterTab = 'all' | 'healthy' | 'at-risk' | 'inactive'

function getScoreColor(score: number) {
    if (score > 70) return 'score-healthy'
    if (score > 30) return 'score-warning'
    return 'score-danger'
}

function getScoreLabel(score: number) {
    if (score > 70) return 'Saludable'
    if (score > 30) return 'Débil'
    return 'En riesgo'
}

function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
}

function daysSince(dateStr: string | null) {
    if (!dateStr) return null
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const INTERACTION_ICON: Record<string, React.ReactNode> = {
    email: <Mail size={10} />,
    calendar: <Calendar size={10} />,
    meeting: <Mic size={10} />,
    manual: <MessageSquare size={10} />,
}

export default function CRMPage() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [interactions, setInteractions] = useState<Interaction[]>([])
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [syncingFireflies, setSyncingFireflies] = useState(false)
    const [recalculating, setRecalculating] = useState(false)
    const [search, setSearch] = useState('')
    const [nlQuery, setNlQuery] = useState('')
    const [filter, setFilter] = useState<FilterTab>('all')
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [newReminderText, setNewReminderText] = useState('')

    useEffect(() => { fetchContacts() }, [])

    const fetchContacts = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('crm_contacts')
            .select('*')
            .order('relationship_score', { ascending: false })
        setContacts(data || [])
        setLoading(false)
    }

    const fetchDetail = async (contactId: string) => {
        setLoadingDetail(true)
        const [{ data: ints }, { data: rems }] = await Promise.all([
            supabase
                .from('crm_interactions')
                .select('*')
                .eq('contact_id', contactId)
                .order('date', { ascending: false })
                .limit(20),
            supabase
                .from('crm_reminders')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: false })
        ])
        setInteractions(ints || [])
        setReminders(rems || [])
        setLoadingDetail(false)
    }

    const openContact = (contact: Contact) => {
        setSelectedContact(contact)
        fetchDetail(contact.id)
    }

    const triggerSync = async () => {
        setSyncing(true)
        try {
            await fetch('/api/crm/sync?token=' + process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN)
            setTimeout(fetchContacts, 5000)
        } catch (e) { console.error(e) }
        setSyncing(false)
    }

    const triggerFirefliesSync = async () => {
        setSyncingFireflies(true)
        try {
            await fetch('/api/crm/sync-fireflies?token=' + process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN)
            setTimeout(fetchContacts, 6000)
        } catch (e) { console.error(e) }
        setSyncingFireflies(false)
    }

    const triggerRecalculate = async () => {
        setRecalculating(true)
        try {
            await fetch('/api/crm/health?token=' + process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN)
            setTimeout(fetchContacts, 3000)
        } catch (e) { console.error(e) }
        setRecalculating(false)
    }

    const addReminder = async () => {
        if (!selectedContact || !newReminderText.trim()) return
        const { data } = await supabase
            .from('crm_reminders')
            .insert({ contact_id: selectedContact.id, text: newReminderText.trim(), source: 'manual' })
            .select()
            .single()
        if (data) setReminders(prev => [data, ...prev])
        setNewReminderText('')
    }

    const updateReminderStatus = async (id: string, status: 'done' | 'pending' | 'snoozed') => {
        const snooze: Partial<Reminder> = status === 'snoozed'
            ? { snoozed_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
            : {}
        await supabase.from('crm_reminders').update({ status, ...snooze }).eq('id', id)
        setReminders(prev => prev.map(r => r.id === id ? { ...r, status, ...snooze } : r))
    }

    const stats = useMemo(() => ({
        total: contacts.length,
        healthy: contacts.filter(c => c.relationship_score > 70).length,
        atRisk: contacts.filter(c => c.relationship_score <= 30).length,
        inactive: contacts.filter(c => {
            const d = daysSince(c.last_interaction_at)
            return d === null || d > 30
        }).length
    }), [contacts])

    const filtered = useMemo(() => {
        let list = contacts
        const q = (nlQuery || search).toLowerCase()
        if (q) {
            list = list.filter(c =>
                c.full_name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.company?.toLowerCase().includes(q) ||
                c.role?.toLowerCase().includes(q) ||
                c.how_i_know?.toLowerCase().includes(q)
            )
        }
        if (filter === 'healthy') list = list.filter(c => c.relationship_score > 70)
        if (filter === 'at-risk') list = list.filter(c => c.relationship_score <= 30)
        if (filter === 'inactive') list = list.filter(c => {
            const d = daysSince(c.last_interaction_at)
            return d === null || d > 30
        })
        return list
    }, [contacts, search, nlQuery, filter])

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: 'Todos', count: stats.total },
        { key: 'healthy', label: '💚 Saludables', count: stats.healthy },
        { key: 'at-risk', label: '🔴 En riesgo', count: stats.atRisk },
        { key: 'inactive', label: '⏸️ Inactivos', count: stats.inactive },
    ]

    const pendingReminders = reminders.filter(r => r.status === 'pending')
    const doneReminders = reminders.filter(r => r.status === 'done')

    return (
        <div className="crm-root">
            {/* Header */}
            <div className="crm-header">
                <div>
                    <h1 className="crm-title">Personal CRM</h1>
                    <p className="crm-subtitle">Gestión de relaciones y salud de contactos</p>
                </div>
                <div className="crm-actions">
                    <button onClick={triggerRecalculate} disabled={recalculating} className="crm-btn crm-btn-ghost" title="Recalcular scores">
                        <CalculatorIcon size={16} />
                        {recalculating ? 'Calculando...' : 'Recalcular Scores'}
                    </button>
                    <button onClick={triggerFirefliesSync} disabled={syncingFireflies} className="crm-btn crm-btn-fireflies">
                        <Mic size={16} className={syncingFireflies ? 'spin' : ''} />
                        {syncingFireflies ? 'Sincronizando...' : 'Sync Fireflies'}
                    </button>
                    <button onClick={triggerSync} disabled={syncing} className="crm-btn crm-btn-primary">
                        <RefreshCw size={16} className={syncing ? 'spin' : ''} />
                        {syncing ? 'Sincronizando...' : 'Sync Gmail / Calendar'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="crm-stats">
                <div className="crm-stat-card">
                    <span className="crm-stat-value">{stats.total}</span>
                    <span className="crm-stat-label">Contactos totales</span>
                </div>
                <div className="crm-stat-card healthy">
                    <span className="crm-stat-value">{stats.healthy}</span>
                    <span className="crm-stat-label">Relaciones saludables</span>
                </div>
                <div className="crm-stat-card danger">
                    <span className="crm-stat-value">{stats.atRisk}</span>
                    <span className="crm-stat-label">En riesgo</span>
                </div>
                <div className="crm-stat-card inactive">
                    <span className="crm-stat-value">{stats.inactive}</span>
                    <span className="crm-stat-label">Sin actividad +30d</span>
                </div>
            </div>

            {/* NL Search */}
            <div className="crm-nl-search">
                <div className="crm-nl-icon"><Sparkles size={16} /></div>
                <input
                    type="text"
                    placeholder='¿Quién conozco en NVIDIA? / ¿Con quién no hablé en un mes?'
                    value={nlQuery}
                    onChange={e => { setNlQuery(e.target.value); setSearch('') }}
                    className="crm-nl-input"
                />
                {nlQuery && <button className="crm-search-clear" onClick={() => setNlQuery('')}><X size={14} /></button>}
            </div>

            {/* Search + Tabs */}
            <div className="crm-toolbar">
                <div className="crm-search-wrapper">
                    <Search size={16} className="crm-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email, empresa o rol..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setNlQuery('') }}
                        className="crm-search"
                    />
                    {search && <button className="crm-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
                </div>
                <div className="crm-tabs">
                    {tabs.map(t => (
                        <button key={t.key} className={`crm-tab ${filter === t.key ? 'active' : ''}`} onClick={() => setFilter(t.key)}>
                            {t.label}<span className="crm-tab-count">{t.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="crm-loading"><div className="crm-spinner" /><p>Cargando contactos...</p></div>
            ) : filtered.length === 0 ? (
                <div className="crm-empty">
                    <Activity size={48} className="crm-empty-icon" />
                    <p>{search || nlQuery ? 'No se encontraron contactos.' : 'Sin contactos aún. Sincronizá Gmail o Fireflies para empezar.'}</p>
                </div>
            ) : (
                <div className="crm-grid">
                    {filtered.map(c => {
                        const days = daysSince(c.last_interaction_at)
                        const avatarColor = getAvatarColor(c.full_name || c.email)
                        return (
                            <div key={c.id} className="crm-card" onClick={() => openContact(c)}>
                                <div className="crm-card-top">
                                    <div className="crm-avatar" style={{ background: avatarColor }}>
                                        {getInitials(c.full_name || c.email)}
                                    </div>
                                    <div className="crm-card-info">
                                        <h3 className="crm-card-name">{c.full_name}</h3>
                                        <p className="crm-card-email">{c.email}</p>
                                    </div>
                                    <span className={`crm-score-badge ${getScoreColor(c.relationship_score)}`}>
                                        {c.relationship_score}
                                    </span>
                                </div>

                                {(c.company || c.role) && (
                                    <div className="crm-card-meta">
                                        {c.company && <div className="crm-card-company"><Building2 size={11} /><span>{c.company}</span></div>}
                                        {c.role && <div className="crm-card-role"><Briefcase size={11} /><span>{c.role}</span></div>}
                                    </div>
                                )}

                                <div className="crm-card-footer">
                                    <span className={`crm-health-label ${getScoreColor(c.relationship_score)}`}>
                                        {getScoreLabel(c.relationship_score)}
                                    </span>
                                    <span className="crm-last-contact">
                                        <Clock size={11} />
                                        {days === null ? 'Sin contacto' : days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days}d`}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Detail Panel */}
            {selectedContact && (
                <>
                    <div className="crm-overlay" onClick={() => setSelectedContact(null)} />
                    <div className="crm-panel">
                        <div className="crm-panel-header">
                            <div className="crm-panel-avatar" style={{ background: getAvatarColor(selectedContact.full_name || selectedContact.email) }}>
                                {getInitials(selectedContact.full_name || selectedContact.email)}
                            </div>
                            <div className="crm-panel-info">
                                <h2>{selectedContact.full_name}</h2>
                                {selectedContact.role && <p className="crm-panel-role">{selectedContact.role}</p>}
                                {selectedContact.company && <p className="crm-panel-company">{selectedContact.company}</p>}
                            </div>
                            <button className="crm-panel-close" onClick={() => setSelectedContact(null)}><X size={20} /></button>
                        </div>

                        <div className="crm-panel-meta">
                            <div className="crm-meta-item"><Mail size={14} /><span>{selectedContact.email}</span></div>
                            <div className="crm-meta-item">
                                <Activity size={14} />
                                <span>Score: <strong>{selectedContact.relationship_score}</strong> — {getScoreLabel(selectedContact.relationship_score)}</span>
                            </div>
                            {selectedContact.how_i_know && (
                                <div className="crm-meta-item"><MessageSquare size={14} /><span>Contexto: {selectedContact.how_i_know}</span></div>
                            )}
                            {selectedContact.last_interaction_at && (
                                <div className="crm-meta-item">
                                    <Clock size={14} />
                                    <span>Último: {new Date(selectedContact.last_interaction_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                            )}
                        </div>

                        {loadingDetail ? (
                            <div className="crm-loading-small"><div className="crm-spinner" /></div>
                        ) : (
                            <>
                                {/* Reminders */}
                                <div className="crm-panel-section">
                                    <h3>Follow-ups & Reminders</h3>

                                    {/* Add reminder */}
                                    <div className="crm-reminder-input">
                                        <input
                                            type="text"
                                            placeholder="Agregar reminder..."
                                            value={newReminderText}
                                            onChange={e => setNewReminderText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addReminder()}
                                            className="crm-mini-input"
                                        />
                                        <button onClick={addReminder} className="crm-add-btn"><Plus size={14} /></button>
                                    </div>

                                    {pendingReminders.length === 0 ? (
                                        <p className="crm-no-interactions">No hay reminders pendientes.</p>
                                    ) : (
                                        <ul className="crm-reminders-list">
                                            {pendingReminders.map(r => (
                                                <li key={r.id} className="crm-reminder-item">
                                                    <div className="crm-reminder-body">
                                                        <p className="crm-reminder-text">{r.text}</p>
                                                        {r.source === 'fireflies' && <span className="crm-reminder-source">🎙️ Fireflies</span>}
                                                    </div>
                                                    <div className="crm-reminder-actions">
                                                        <button
                                                            className="crm-reminder-btn done"
                                                            onClick={() => updateReminderStatus(r.id, 'done')}
                                                            title="Marcar como hecho"
                                                        ><Check size={13} /></button>
                                                        <button
                                                            className="crm-reminder-btn snooze"
                                                            onClick={() => updateReminderStatus(r.id, 'snoozed')}
                                                            title="Snooze 7 días"
                                                        ><AlarmClock size={13} /></button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {doneReminders.length > 0 && (
                                        <details className="crm-done-section">
                                            <summary>{doneReminders.length} completados</summary>
                                            <ul className="crm-reminders-list done-list">
                                                {doneReminders.map(r => (
                                                    <li key={r.id} className="crm-reminder-item done">
                                                        <p className="crm-reminder-text">{r.text}</p>
                                                        <button className="crm-reminder-btn undo" onClick={() => updateReminderStatus(r.id, 'pending')}>
                                                            ↩
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>

                                {/* Interactions */}
                                <div className="crm-panel-section">
                                    <h3>Historial de interacciones</h3>
                                    {interactions.length === 0 ? (
                                        <p className="crm-no-interactions">Sin interacciones registradas.</p>
                                    ) : (
                                        <ul className="crm-interactions">
                                            {interactions.map(i => (
                                                <li key={i.id} className="crm-interaction-item">
                                                    <div className={`crm-interaction-dot type-${i.type}`}>
                                                        {INTERACTION_ICON[i.type] ?? <Activity size={10} />}
                                                    </div>
                                                    <div className="crm-interaction-body">
                                                        <p className="crm-interaction-summary">{i.summary || '(Sin asunto)'}</p>
                                                        <span className="crm-interaction-date">
                                                            {new Date(i.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} · {i.type}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
