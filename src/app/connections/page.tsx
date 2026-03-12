// [COPY-PASTE-SAFE]
// Archivo: src/app/connections/page.tsx

'use client'

import { useState, useEffect } from 'react'
import {
    Link as LinkIcon,
    Database,
    HardDrive,
    FileText,
    Search,
    AlertCircle,
    RefreshCcw,
    Github,
    Chrome,
    BookOpen
} from 'lucide-react'
import './Connections.css'

interface MCPServer {
    id: string
    name: string
    status: string
    description: string
    metrics: {
        latency: string
        lastSync: string
    }
}

export default function ConnectionsPage() {
    const [connections, setConnections] = useState<MCPServer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchConnections() {
            try {
                const response = await fetch('/api/mcp')
                const data = await response.json()
                if (data.success) {
                    setConnections(data.servers)
                }
            } catch (error) {
                console.error('Failed to fetch MCP connections:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchConnections()
    }, [])

    const getIcon = (id: string) => {
        const lowerId = id.toLowerCase()
        if (lowerId.includes('supabase')) return Database
        if (lowerId.includes('notion')) return FileText
        if (lowerId.includes('firecrawl')) return Search
        if (lowerId.includes('pinecone')) return HardDrive
        if (lowerId.includes('github')) return Github
        if (lowerId.includes('notebook')) return BookOpen
        if (lowerId.includes('fireflies')) return LinkIcon
        return LinkIcon
    }

    if (loading) {
        return <div className="connections-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="animate-pulse" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>Cargando Red Neural...</div>
        </div>
    }

    return (
        <div className="connections-page">
            <header className="conn-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div className="cc-eyebrow" style={{ color: 'var(--brand-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <LinkIcon size={18} />
                            <span>System Integrations</span>
                        </div>
                        <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Connections Map</h1>
                        <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.60)', marginTop: '0.5rem' }}>
                            Gestión de herramientas y servicios externos acoplados a la flota.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.875rem' }}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" style={{ backgroundColor: 'var(--brand-green)' }}></span>
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--brand-green)' }}></span>
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.87)' }}>System Stable</span>
                    </div>
                </div>
            </header>

            {/* Visual Map */}
            <section className="conn-map-container shadow-sm">
                <div className="conn-map-title">
                    <LinkIcon size={20} />
                    <span>Red Neural de Conexiones</span>
                </div>

                <div className="conn-graph">
                    <svg className="conn-lines-svg">
                        <defs>
                            <linearGradient id="glow-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--brand-green)" stopOpacity="0.2" />
                                <stop offset="50%" stopColor="var(--brand-green)" stopOpacity="1" />
                                <stop offset="100%" stopColor="var(--brand-green)" stopOpacity="0.2" />
                            </linearGradient>
                        </defs>
                        {connections.map((conn, idx) => {
                            const angle = (idx / connections.length) * 2 * Math.PI
                            const x2 = 50 + 25 * Math.cos(angle)
                            const y2 = 50 + 25 * Math.sin(angle)
                            return (
                                <line
                                    key={`line-${conn.id}`}
                                    x1="50%" y1="50%"
                                    x2={`${x2}%`} y2={`${y2}%`}
                                    className={`conn-line ${conn.status === 'connected' ? 'conn-line-active' : ''}`}
                                />
                            )
                        })}
                    </svg>

                    {/* Central Node */}
                    <div className="conn-node-center">
                        <div className="conn-node-icon">
                            <Chrome size={32} />
                        </div>
                        <span className="conn-node-label">OPEN CLAW</span>
                    </div>

                    {/* Satellite Nodes layer */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {connections.map((conn, idx) => {
                            const angle = (idx / connections.length) * 2 * Math.PI
                            const left = 50 + 30 * Math.cos(angle)
                            const top = 50 + 30 * Math.sin(angle)
                            const Icon = getIcon(conn.id)

                            return (
                                <div
                                    key={`node-${conn.id}`}
                                    className="conn-node-satellite shadow-sm"
                                    data-status={conn.status}
                                    style={{
                                        position: 'absolute',
                                        top: `${top}%`,
                                        left: `${left}%`,
                                        pointerEvents: 'auto',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    <Icon size={24} className="conn-satellite-icon" />
                                    <span className="conn-satellite-label">{conn.name}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Integrations Grid */}
            <section>
                <div className="conn-list-header">
                    <h2 className="conn-list-title">Integraciones Activas ({connections.length})</h2>
                </div>

                <div className="conn-grid">
                    {connections.map((conn) => {
                        const Icon = getIcon(conn.id)
                        return (
                            <div key={conn.id} className="premium-card conn-card">
                                <div className="conn-card-header">
                                    <div className="conn-card-info">
                                        <div className="conn-card-icon-wrapper shadow-sm">
                                            <Icon size={20} style={{ color: 'rgba(255,255,255,0.87)' }} />
                                        </div>
                                        <div>
                                            <h3 className="conn-card-name">{conn.name}</h3>
                                            <p className="conn-card-desc">{conn.description}</p>
                                        </div>
                                    </div>
                                    <div className="conn-status-pill" data-status={conn.status}>
                                        {conn.status === 'connected' && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />}
                                        {conn.status === 'degraded' && <AlertCircle size={12} />}
                                        {conn.status === 'disconnected' && <RefreshCcw size={12} />}
                                        <span style={{ textTransform: 'capitalize' }}>{conn.status}</span>
                                    </div>
                                </div>

                                <div className="conn-card-metrics">
                                    <div className="conn-metric">
                                        <span className="conn-metric-label">Latency</span>
                                        <span className="conn-metric-value">{conn.metrics.latency}</span>
                                    </div>
                                    <div className="conn-metric">
                                        <span className="conn-metric-label">Last Sync</span>
                                        <span className="conn-metric-value">{conn.metrics.lastSync}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}

