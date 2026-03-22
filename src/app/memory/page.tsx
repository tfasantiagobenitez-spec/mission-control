'use client'

import { useEffect, useState } from 'react'
import {
    Brain,
    Database,
    MessageSquare,
    Zap,
    CheckCircle,
    XCircle,
    Clock,
    Tag,
    Activity,
    Layers,
    Search,
    RefreshCw,
    BookOpen,
    Share2,
} from 'lucide-react'
import './Memory.css'

interface MemoryStats {
    totalFacts: number
    totalMessages: number
    lastActivity: string | null
}

interface Fact {
    key: string
    value: string
    source?: string
    updated_at: string
}

interface ActivityEntry {
    action: string
    details: string
    status: string
    created_at: string
}

interface MemoryData {
    stats: MemoryStats
    recentFacts: Fact[]
    recentActivity: ActivityEntry[]
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora mismo'
    if (mins < 60) return `hace ${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    return `hace ${Math.floor(hours / 24)}d`
}

const MEMORY_LAYERS = [
    {
        id: 'facts',
        label: 'Hechos Persistentes',
        sublabel: 'conversation_facts',
        description: 'Datos clave extraídos automáticamente de conversaciones con el agente mediante LLM. Se actualizan en cada sesión.',
        icon: Brain,
        color: 'var(--brand-blue)',
        bg: 'rgba(59, 130, 246, 0.1)',
        status: 'active',
    },
    {
        id: 'messages',
        label: 'Historial de Conversaciones',
        sublabel: 'conversation_messages',
        description: 'Mensajes recientes del agente y el usuario. Alimentan el contexto corto para respuestas coherentes.',
        icon: MessageSquare,
        color: 'var(--brand-orange)',
        bg: 'rgba(229, 133, 15, 0.1)',
        status: 'active',
    },
    {
        id: 'knowledge',
        label: 'Base de Conocimiento',
        sublabel: 'Pinecone · knowledge-base',
        description: 'Artículos, videos de YouTube y contenido semántico indexado en Pinecone para RAG. Búsqueda vectorial con reranking.',
        icon: BookOpen,
        color: '#a78bfa',
        bg: 'rgba(167, 139, 250, 0.1)',
        status: 'active',
    },
    {
        id: 'activity',
        label: 'Log de Actividad',
        sublabel: 'activity_log',
        description: 'Registro de acciones del sistema: sincronizaciones, errores, tareas ejecutadas. Usado para el contexto del advisory.',
        icon: Activity,
        color: 'var(--brand-green)',
        bg: 'rgba(46, 204, 143, 0.1)',
        status: 'active',
    },
    {
        id: 'datastore',
        label: 'Data Store',
        sublabel: 'data_store',
        description: 'Almacenamiento key-value flexible para configuraciones, XP, y métricas persistentes del sistema.',
        icon: Database,
        color: '#f472b6',
        bg: 'rgba(244, 114, 182, 0.1)',
        status: 'active',
    },
]

export default function MemoryPage() {
    const [data, setData] = useState<MemoryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = async () => {
        try {
            setRefreshing(true)
            const res = await fetch('/api/memory/stats')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            if (json.error) throw new Error(json.error)
            setData(json)
            setError(null)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    return (
        <div className="memory-page">
            {/* ─── Header ─── */}
            <header className="memory-header">
                <div className="cc-eyebrow" style={{ color: 'var(--brand-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <Brain size={18} />
                    <span>Cognitive Repository</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255,255,255,0.87)', margin: 0 }}>Brain</h1>
                        <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.60)', marginTop: '0.5rem' }}>
                            Sistema de memorias multi-capa · Supabase + Pinecone
                        </p>
                    </div>
                    <button
                        className="btn-secondary"
                        style={{ padding: '0.75rem 1.25rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={fetchData}
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        Actualizar
                    </button>
                </div>
            </header>

            {/* ─── Stats ─── */}
            <div className="memory-stats-grid">
                <div className="memory-stat-card">
                    <div className="memory-stat-icon"><Database size={20} /></div>
                    <div className="memory-stat-value">
                        {loading ? '–' : data?.stats.totalFacts?.toLocaleString() ?? '–'}
                    </div>
                    <div className="memory-stat-label">Hechos extraídos</div>
                </div>
                <div className="memory-stat-card">
                    <div className="memory-stat-icon" style={{ background: 'rgba(229,133,15,0.1)', color: 'var(--brand-orange)' }}>
                        <MessageSquare size={20} />
                    </div>
                    <div className="memory-stat-value">
                        {loading ? '–' : data?.stats.totalMessages?.toLocaleString() ?? '–'}
                    </div>
                    <div className="memory-stat-label">Mensajes en historial</div>
                </div>
                <div className="memory-stat-card">
                    <div className="memory-stat-icon" style={{ background: 'rgba(46,204,143,0.1)', color: 'var(--brand-green)' }}>
                        <Zap size={20} />
                    </div>
                    <div className="memory-stat-value">5</div>
                    <div className="memory-stat-label">Capas de memoria</div>
                </div>
            </div>

            {/* ─── Error banner ─── */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '1rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                    <XCircle size={16} />
                    No se pudo conectar a Supabase: {error}
                </div>
            )}

            {/* ─── Architecture Description ─── */}
            <div className="memory-vault">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Layers size={18} color="rgba(255,255,255,0.6)" />
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255,255,255,0.87)', margin: 0 }}>Capas del Sistema</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {MEMORY_LAYERS.map(layer => {
                        const Icon = layer.icon
                        let count: number | null = null
                        let subtitle = ''
                        if (layer.id === 'facts' && data) { count = data.stats.totalFacts; subtitle = `Última actualización: ${data.recentFacts[0] ? timeAgo(data.recentFacts[0].updated_at) : '–'}` }
                        if (layer.id === 'messages' && data) { count = data.stats.totalMessages; subtitle = data.recentActivity[0] ? `Última actividad: ${timeAgo(data.recentActivity[0].created_at)}` : '' }

                        return (
                            <div key={layer.id} style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '1rem',
                                padding: '1.25rem 1.5rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '1.25rem',
                                transition: 'background 0.2s',
                            }}>
                                <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: layer.bg, color: layer.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.87)', fontSize: '0.9375rem' }}>{layer.label}</span>
                                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: layer.color, background: layer.bg, padding: '0.15rem 0.6rem', borderRadius: '0.5rem' }}>{layer.sublabel}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                                            <CheckCircle size={12} color="var(--brand-green)" />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--brand-green)', fontWeight: 600 }}>ACTIVO</span>
                                        </div>
                                    </div>
                                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>{layer.description}</p>
                                    {(count !== null || subtitle) && (
                                        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {count !== null && (
                                                <span style={{ fontSize: '0.75rem', color: layer.color, fontWeight: 600 }}>
                                                    {loading ? '...' : count.toLocaleString()} registros
                                                </span>
                                            )}
                                            {subtitle && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{subtitle}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ─── Recent Facts ─── */}
            <div className="memory-vault">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Tag size={18} color="rgba(255,255,255,0.6)" />
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255,255,255,0.87)', margin: 0 }}>Hechos Recientes</h2>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)' }}>
                        {loading ? '' : `${data?.recentFacts.length ?? 0} de ${data?.stats.totalFacts ?? 0}`}
                    </span>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>Cargando hechos…</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
                        No se pudieron cargar los hechos.
                    </div>
                ) : data?.recentFacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
                        No hay hechos almacenados aún. Interactuá con el agente para que comience a aprender.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {data!.recentFacts.map((fact, i) => (
                            <div key={i} className="engram-card" style={{ padding: '1rem 1.25rem' }}>
                                <div className="engram-header">
                                    <div className="engram-meta">
                                        <span className="engram-id" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{fact.key}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem' }}>
                                            <Clock size={11} />
                                            {timeAgo(fact.updated_at)}
                                        </div>
                                    </div>
                                    {fact.source && (
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                            vía {fact.source.slice(0, 30)}
                                        </span>
                                    )}
                                </div>
                                <div className="engram-content" style={{ marginTop: '0.5rem' }}>{fact.value}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Recent Activity ─── */}
            <div className="memory-vault">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Activity size={18} color="rgba(255,255,255,0.6)" />
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255,255,255,0.87)', margin: 0 }}>Actividad Reciente del Sistema</h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>Cargando actividad…</div>
                ) : !data?.recentActivity.length ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>Sin actividad registrada.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {data!.recentActivity.map((entry, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '1rem',
                                padding: '0.75rem 0',
                                borderBottom: i < data!.recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                                    background: entry.status === 'success' ? 'var(--brand-green)' : entry.status === 'error' ? '#ef4444' : 'var(--brand-orange)'
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.action}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{timeAgo(entry.created_at)}</span>
                                    </div>
                                    {entry.details && (
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {entry.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
