'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ActivityLog } from '@/components/ActivityLog'
import {
    TrendingUp, Users, Target, FolderOpen, AlertTriangle,
    Clock, DollarSign, Sparkles, Zap, ArrowRight, RefreshCw,
    CheckCircle2, Activity
} from 'lucide-react'
import './CommandCenter.css'

type DashboardStats = {
    kpis: {
        pipeline: number
        activeClients: number
        activeLeads: number
        activeProjects: number
        totalMessages: number
    }
    alerts: {
        staleLeads: { name: string; company: string | null; daysSince: number }[]
        staleDeals: { title: string; value: number; daysSince: number }[]
        staleProjects: { name: string; daysSince: number }[]
    }
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchStats = () => {
        setLoading(true)
        fetch('/api/dashboard/stats')
            .then(r => r.json())
            .then(d => {
                setStats(d)
                setLastUpdated(new Date())
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchStats() }, [])

    const totalAlerts = (stats?.alerts.staleLeads.length ?? 0) +
        (stats?.alerts.staleDeals.length ?? 0) +
        (stats?.alerts.staleProjects.length ?? 0)

    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

    return (
        <div className="command-center">
            {/* Header */}
            <header className="cc-header">
                <div className="cc-header-title">
                    <div className="cc-eyebrow">
                        <Sparkles size={16} className="animate-pulse-soft" />
                        <span>COMMAND CENTER</span>
                    </div>
                    <h1 className="cc-title">{greeting}, Santi</h1>
                    <p className="cc-subtitle">
                        Estado del negocio en tiempo real — <span style={{ color: 'var(--brand-blue)', fontStyle: 'italic' }}>Arecco IA</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Actualizado {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={fetchStats}
                        className="cc-status-badge shadow-sm"
                        style={{ cursor: 'pointer', gap: '8px' }}
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                    {totalAlerts > 0 && (
                        <div className="cc-status-badge shadow-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                            <AlertTriangle size={13} />
                            {totalAlerts} alertas
                        </div>
                    )}
                </div>
            </header>

            {/* KPIs reales */}
            <div className="cc-stats-grid">
                <KpiCard
                    title="Pipeline Total"
                    value={loading ? '—' : `$${(stats?.kpis.pipeline ?? 0).toLocaleString()}`}
                    icon={<DollarSign size={20} />}
                    color="blue"
                    badge="deals activos"
                    href="/business-crm/pipeline"
                />
                <KpiCard
                    title="Clientes Activos"
                    value={loading ? '—' : String(stats?.kpis.activeClients ?? 0)}
                    icon={<Users size={20} />}
                    color="green"
                    badge="en cartera"
                    href="/business-crm/clientes"
                />
                <KpiCard
                    title="Leads en Curso"
                    value={loading ? '—' : String(stats?.kpis.activeLeads ?? 0)}
                    icon={<Target size={20} />}
                    color="orange"
                    badge="sin convertir"
                    href="/business-crm/leads"
                />
                <KpiCard
                    title="Proyectos Activos"
                    value={loading ? '—' : String(stats?.kpis.activeProjects ?? 0)}
                    icon={<FolderOpen size={20} />}
                    color="red"
                    badge="en ejecución"
                    href="/business-crm/proyectos"
                />
            </div>

            {/* Alertas */}
            {!loading && totalAlerts > 0 && (
                <section style={{ marginBottom: '2rem' }}>
                    <div className="cc-section-header" style={{ marginBottom: '1rem' }}>
                        <div className="cc-section-icon shadow-sm" style={{ color: '#f87171' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className="cc-section-title">Requieren Atención</h2>
                            <p className="cc-section-subtitle">Elementos sin actividad reciente</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>

                        {/* Leads sin contactar */}
                        {stats!.alerts.staleLeads.length > 0 && (
                            <div className="premium-card" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                    <Target size={14} style={{ color: '#f97316' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Leads sin contactar
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {stats!.alerts.staleLeads.map((l, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{l.name || 'Sin nombre'}</p>
                                                {l.company && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.company}</p>}
                                            </div>
                                            <span style={{ fontSize: '11px', background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '999px' }}>
                                                {l.daysSince}d
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/business-crm/leads" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.75rem', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Ver todos <ArrowRight size={12} />
                                </Link>
                            </div>
                        )}

                        {/* Deals sin actualizar */}
                        {stats!.alerts.staleDeals.length > 0 && (
                            <div className="premium-card" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                    <TrendingUp size={14} style={{ color: '#eab308' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Deals sin mover
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {stats!.alerts.staleDeals.map((d, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{d.title}</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${Number(d.value).toLocaleString()}</p>
                                            </div>
                                            <span style={{ fontSize: '11px', background: 'rgba(234,179,8,0.15)', color: '#facc15', padding: '2px 8px', borderRadius: '999px' }}>
                                                {d.daysSince}d
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/business-crm/pipeline" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.75rem', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Ver pipeline <ArrowRight size={12} />
                                </Link>
                            </div>
                        )}

                        {/* Proyectos sin actividad */}
                        {stats!.alerts.staleProjects.length > 0 && (
                            <div className="premium-card" style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                    <FolderOpen size={14} style={{ color: '#a78bfa' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Proyectos sin actividad
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {stats!.alerts.staleProjects.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</p>
                                            <span style={{ fontSize: '11px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: '999px' }}>
                                                {p.daysSince}d
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/business-crm/proyectos" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.75rem', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Ver proyectos <ArrowRight size={12} />
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* No alerts state */}
            {!loading && totalAlerts === 0 && stats && (
                <div className="premium-card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Todo al día — sin leads, deals ni proyectos que necesiten atención.
                    </p>
                </div>
            )}

            {/* Main grid */}
            <div className="cc-main-grid">
                {/* Activity Feed */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="cc-section-header">
                        <div className="cc-section-icon shadow-sm">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="cc-section-title">Actividad en Vivo</h2>
                            <p className="cc-section-subtitle">Transcripción en tiempo real</p>
                        </div>
                    </div>
                    <div className="premium-card">
                        <ActivityLog />
                    </div>
                </section>

                {/* Accesos rápidos */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Advisory */}
                    <div className="premium-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <Sparkles size={16} style={{ color: '#a78bfa' }} />
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Advisory Council</h3>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            Análisis estratégico de tus proyectos con 6 agentes de IA en paralelo.
                        </p>
                        <Link href="/agents/advisory-council" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>
                            Abrir Council <ArrowRight size={12} />
                        </Link>
                    </div>

                    {/* Accesos directos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Accesos directos</p>
                        {[
                            { href: '/business-crm/leads', label: 'Gestionar Leads', icon: Target, color: '#f97316' },
                            { href: '/business-crm/pipeline', label: 'Ver Pipeline', icon: TrendingUp, color: '#eab308' },
                            { href: '/business-crm/proyectos', label: 'Proyectos', icon: FolderOpen, color: '#a78bfa' },
                            { href: '/tasks', label: 'Tareas ClickUp', icon: CheckCircle2, color: '#22c55e' },
                            { href: '/agents/advisory-council', label: 'Correr Advisory', icon: Zap, color: '#60a5fa' },
                        ].map(item => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="premium-card"
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', textDecoration: 'none' }}
                                >
                                    <Icon size={15} style={{ color: item.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                                    <ArrowRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                                </Link>
                            )
                        })}
                    </div>

                    {/* Stats del sistema */}
                    <div className="premium-card config-panel">
                        <div className="config-item">
                            <div className="config-label-group">
                                <Clock size={14} />
                                <span className="config-label">Mensajes totales</span>
                            </div>
                            <span className="config-value">{stats?.kpis.totalMessages.toLocaleString() ?? '—'}</span>
                        </div>
                        <div className="config-item">
                            <div className="config-label-group">
                                <Activity size={14} />
                                <span className="config-label">Sistema</span>
                            </div>
                            <span className="config-value" style={{ color: 'var(--brand-green)' }}>Operativo</span>
                        </div>
                    </div>

                </section>
            </div>
        </div>
    )
}

function KpiCard({ title, value, icon, color, badge, href }: {
    title: string; value: string; icon: React.ReactNode
    color: 'blue' | 'green' | 'orange' | 'red'; badge: string; href: string
}) {
    return (
        <Link href={href} style={{ textDecoration: 'none' }}>
            <div className="stat-card shadow-sm" data-color={color} style={{ cursor: 'pointer' }}>
                <div className="stat-header">
                    <div className="stat-icon shadow-sm">{icon}</div>
                    <div className="stat-badge">{badge}</div>
                </div>
                <div className="stat-content">
                    <p className="stat-value">{value}</p>
                    <h3 className="stat-label">{title}</h3>
                </div>
            </div>
        </Link>
    )
}
