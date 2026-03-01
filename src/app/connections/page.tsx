// [COPY-PASTE-SAFE]
// Archivo: src/app/connections/page.tsx

import { Link as LinkIcon, Database, HardDrive, FileText, Search, AlertCircle, RefreshCcw } from 'lucide-react'
import './Connections.css'

export default function ConnectionsPage() {

    const connections = [
        {
            id: 'supabase',
            name: 'Supabase',
            description: 'Primary Vector DB & Auth',
            status: 'connected',
            latency: '45ms',
            lastSync: 'Hace 2 min',
            icon: Database
        },
        {
            id: 'notion',
            name: 'Notion',
            description: 'Second Brain Sync',
            status: 'connected',
            latency: '120ms',
            lastSync: 'Hace 5 min',
            icon: FileText
        },
        {
            id: 'firecrawl',
            name: 'Firecrawl',
            description: 'Web Scraping Engine',
            status: 'degraded',
            latency: '850ms',
            lastSync: 'Hace 1 hora',
            icon: Search
        },
        {
            id: 'pinecone',
            name: 'Pinecone',
            description: 'Fast Vector Search',
            status: 'disconnected',
            latency: '--',
            lastSync: 'Desconocido',
            icon: HardDrive
        }
    ]

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
                    {/* SVG paths for lines */}
                    <svg className="conn-lines-svg">
                        {/* Define glowing gradient */}
                        <defs>
                            <linearGradient id="glow-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--brand-green)" stopOpacity="0.2" />
                                <stop offset="50%" stopColor="var(--brand-green)" stopOpacity="1" />
                                <stop offset="100%" stopColor="var(--brand-green)" stopOpacity="0.2" />
                            </linearGradient>
                        </defs>
                        {/* We use basic horizontal lines here for structural mock. Real apps would calculate positions. */}
                        <line x1="50%" y1="50%" x2="25%" y2="25%" className="conn-line conn-line-active" />
                        <line x1="50%" y1="50%" x2="25%" y2="75%" className="conn-line conn-line-active" />
                        <line x1="50%" y1="50%" x2="75%" y2="25%" className="conn-line" style={{ stroke: 'var(--brand-orange)' }} />
                        <line x1="50%" y1="50%" x2="75%" y2="75%" className="conn-line" />
                    </svg>

                    {/* Central Node */}
                    <div className="conn-node-center">
                        <div className="conn-node-icon">
                            <HardDrive size={32} />
                        </div>
                        <span className="conn-node-label">CORE AI</span>
                    </div>

                    {/* Satellite Nodes layer */}
                    <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Top Left */}
                        <div className="conn-node-satellite shadow-sm" data-status="connected" style={{ position: 'absolute', top: '20%', left: '20%', pointerEvents: 'auto' }}>
                            <Database size={24} className="conn-satellite-icon" />
                            <span className="conn-satellite-label">Supabase</span>
                        </div>
                        {/* Bottom Left */}
                        <div className="conn-node-satellite shadow-sm" data-status="connected" style={{ position: 'absolute', bottom: '20%', left: '20%', pointerEvents: 'auto' }}>
                            <FileText size={24} className="conn-satellite-icon" />
                            <span className="conn-satellite-label">Notion</span>
                        </div>
                        {/* Top Right */}
                        <div className="conn-node-satellite shadow-sm" data-status="degraded" style={{ position: 'absolute', top: '20%', right: '20%', pointerEvents: 'auto' }}>
                            <Search size={24} className="conn-satellite-icon" />
                            <span className="conn-satellite-label">Firecrawl</span>
                        </div>
                        {/* Bottom Right */}
                        <div className="conn-node-satellite shadow-sm" data-status="disconnected" style={{ position: 'absolute', bottom: '20%', right: '20%', pointerEvents: 'auto' }}>
                            <HardDrive size={24} className="conn-satellite-icon" />
                            <span className="conn-satellite-label">Pinecone</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Integrations Grid */}
            <section>
                <div className="conn-list-header">
                    <h2 className="conn-list-title">Integraciones Activas</h2>
                </div>

                <div className="conn-grid">
                    {connections.map((conn) => {
                        const Icon = conn.icon
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
                                        <span className="conn-metric-value">{conn.latency}</span>
                                    </div>
                                    <div className="conn-metric">
                                        <span className="conn-metric-label">Last Sync</span>
                                        <span className="conn-metric-value">{conn.lastSync}</span>
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
