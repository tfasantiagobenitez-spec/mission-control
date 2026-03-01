// [COPY-PASTE-SAFE]
// Archivo: src/app/content-intel/page.tsx

'use client'

import { BarChart3, TrendingUp, Newspaper, Zap, ArrowUpRight, ArrowDownRight, Share2, Eye, MessageSquare } from 'lucide-react'
import './ContentIntel.css'

export default function ContentIntelPage() {
    // Mock data for the visual chart
    const chartData = [45, 78, 56, 92, 44, 85, 67, 34, 77, 95, 60, 48]

    // Mock data for discovery feed
    const discoveries = [
        {
            id: 1,
            title: "Rise of Agentic Workflow in Enterprise SaaS",
            source: "Twitter / TechCrunch",
            heat: "High",
            tag: "Trends",
            date: "2h ago"
        },
        {
            id: 2,
            title: "New Open Source LLM benchmarks show 20% efficiency gain",
            source: "Hacker News",
            heat: "Medium",
            tag: "Research",
            date: "5h ago"
        },
        {
            id: 3,
            title: "Content Automation: Best practices for multi-platform sync",
            source: "Internal Knowledge",
            heat: "High",
            tag: "Insight",
            date: "Yesterday"
        }
    ]

    return (
        <div className="intel-page">
            <header className="intel-header">
                <div className="cc-eyebrow" style={{ color: 'var(--brand-orange)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <BarChart3 size={18} />
                    <span>Inteligencia de Contenido</span>
                </div>
                <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Content Intelligence</h1>
                <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.60)', marginTop: '0.5rem' }}>
                    Monitoreo de métricas, tendencias de mercado y descubrimientos estratégicos.
                </p>
            </header>

            <div className="intel-grid">
                {/* Columna de Analytics */}
                <div className="analytics-column">
                    <div className="metrics-summary">
                        <div className="metric-mini-card" style={{ '--accent-color': 'var(--brand-blue)' } as React.CSSProperties}>
                            <div className="metric-label">Reach Total</div>
                            <div className="metric-value">128.4K</div>
                            <div className="metric-change positive">
                                <ArrowUpRight size={12} style={{ display: 'inline' }} /> 12.5%
                            </div>
                        </div>
                        <div className="metric-mini-card" style={{ '--accent-color': 'var(--brand-green)' } as React.CSSProperties}>
                            <div className="metric-label">Engagement</div>
                            <div className="metric-value">8.2%</div>
                            <div className="metric-change positive">
                                <ArrowUpRight size={12} style={{ display: 'inline' }} /> 4.2%
                            </div>
                        </div>
                        <div className="metric-mini-card" style={{ '--accent-color': 'var(--brand-orange)' } as React.CSSProperties}>
                            <div className="metric-label">Conversiones</div>
                            <div className="metric-value">1,402</div>
                            <div className="metric-change negative">
                                <ArrowDownRight size={12} style={{ display: 'inline' }} /> 1.8%
                            </div>
                        </div>
                    </div>

                    <div className="chart-container">
                        <div className="chart-header">
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', marginBottom: '4px' }}>Rendimiento de Canales</h3>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)' }}>Visualización de impresiones por hora (últimas 12h)</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div className="discovery-tag" style={{ background: 'rgba(90, 156, 245, 0.1)', color: 'var(--brand-blue)' }}>Direct</div>
                                <div className="discovery-tag">Organic</div>
                            </div>
                        </div>

                        <div className="visual-chart">
                            {chartData.map((val, i) => (
                                <div key={i} className="chart-bar-wrapper">
                                    <div
                                        className="chart-bar"
                                        style={{ height: `${val}%` }}
                                    ></div>
                                    <span className="chart-label">{12 - i}h</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div className="discovery-card" style={{ border: 'none', background: 'rgba(255,255,255,0.03)' }}>
                                <div className="metric-label" style={{ marginBottom: '1rem' }}>Distribución de Audiencia</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { l: 'Twitter', v: 45, c: 'var(--brand-blue)' },
                                        { l: 'LinkedIn', v: 30, c: '#0077B5' },
                                        { l: 'YouTube', v: 25, c: 'var(--brand-red)' }
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '10px', width: '60px', color: 'rgba(255,255,255,0.5)' }}>{item.l}</span>
                                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${item.v}%`, background: item.c }}></div>
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{item.v}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="discovery-card" style={{ border: 'none', background: 'rgba(255,255,255,0.03)' }}>
                                <div className="metric-label" style={{ marginBottom: '1rem' }}>Top Keywords</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {['AI Agent', 'Workflow', 'Next.js 15', 'Automation', 'SaaS', 'MCP Server'].map((tag, i) => (
                                        <span key={i} className="discovery-tag" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna de Discovery */}
                <div className="discovery-column">
                    <h2 className="discovery-section-title">Discovery Feed</h2>
                    <div className="discovery-feed">
                        {discoveries.map((item) => (
                            <div key={item.id} className="discovery-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span className="discovery-tag">
                                        {item.tag === 'Trends' && <TrendingUp size={10} />}
                                        {item.tag === 'Research' && <Newspaper size={10} />}
                                        {item.tag === 'Insight' && <Zap size={10} />}
                                        {item.tag}
                                    </span>
                                    <span className={`heat-badge ${item.heat === 'High' ? 'heat-high' : 'heat-medium'}`}>
                                        {item.heat} Heat
                                    </span>
                                </div>
                                <h3 className="discovery-title">{item.title}</h3>
                                <div className="discovery-meta">
                                    <span style={{ color: 'rgba(255,255,255,0.38)' }}>{item.source}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>{item.date}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.38)', fontSize: '10px' }}>
                                        <Eye size={12} /> 1.2K
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.38)', fontSize: '10px' }}>
                                        <MessageSquare size={12} /> 48
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.38)', fontSize: '10px' }}>
                                        <Share2 size={12} /> 12
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="btn-secondary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                        Ver más descubrimientos
                    </button>
                </div>
            </div>
        </div>
    )
}
