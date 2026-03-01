// [COPY-PASTE-SAFE]
// Archivo: src/app/productivity/page.tsx

'use client'

import {
    Zap,
    TrendingUp,
    Clock,
    CheckCircle,
    Cpu,
    ArrowUpRight,
    Lightbulb,
    BarChart3
} from 'lucide-react'
import './Productivity.css'

export default function ProductivityPage() {
    const velocityData = [
        { label: 'Lun', value: 65 },
        { label: 'Mar', value: 45 },
        { label: 'Mié', value: 85 },
        { label: 'Jue', value: 70 },
        { label: 'Vie', value: 95 },
        { label: 'Sáb', value: 30 },
        { label: 'Dom', value: 20 },
    ]

    return (
        <div className="productivity-page">
            <header className="productivity-header">
                <div className="cc-eyebrow" style={{ color: 'var(--brand-orange)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <TrendingUp size={18} />
                    <span>Performance Analytics</span>
                </div>
                <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Efficiency & Output</h1>
                <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.60)', marginTop: '0.5rem' }}>
                    Métricas de optimización de tiempo y efectividad operativa del agente.
                </p>
            </header>

            <div className="productivity-grid">
                <div className="velocity-card">
                    <div className="velocity-header">
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)' }}>Task Velocity</h3>
                            <span style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.38)' }}>Tareas completadas por día</span>
                        </div>
                        <div style={{ color: 'var(--brand-green)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                            <ArrowUpRight size={16} />
                            +12% vs semana anterior
                        </div>
                    </div>

                    <div className="velocity-chart">
                        {velocityData.map((day) => (
                            <div key={day.label} className="velocity-bar-container">
                                <div
                                    className="velocity-bar"
                                    style={{ height: `${day.value}%` }}
                                    data-value={day.value}
                                ></div>
                                <span className="velocity-label">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="metrics-column">
                    <div className="metric-mini-card">
                        <div className="metric-mini-icon">
                            <Clock size={24} />
                        </div>
                        <div className="metric-mini-info">
                            <h4>Human Hours Saved</h4>
                            <div>142.5 hrs</div>
                        </div>
                    </div>

                    <div className="metric-mini-card">
                        <div className="metric-mini-icon" style={{ background: 'rgba(90, 156, 245, 0.1)', color: 'var(--brand-blue)' }}>
                            <CheckCircle size={24} />
                        </div>
                        <div className="metric-mini-info">
                            <h4>Success Rate</h4>
                            <div>99.2%</div>
                        </div>
                    </div>

                    <div className="metric-mini-card">
                        <div className="metric-mini-icon" style={{ background: 'rgba(46, 204, 143, 0.1)', color: 'var(--brand-green)' }}>
                            <Cpu size={24} />
                        </div>
                        <div className="metric-mini-info">
                            <h4>Avg. Response Time</h4>
                            <div>1.2s</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="insights-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Lightbulb size={20} color="var(--brand-orange)" />
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Optimization Insights</h2>
                </div>

                <div className="insight-card">
                    <div className="insight-icon">
                        <Zap size={20} />
                    </div>
                    <div className="insight-text">
                        <h5>Batching de Tareas de Supabase</h5>
                        <p>El agente ha identificado que agrupar las escrituras de logs en bloques de 5 segundos reduce la latencia de red en un 15%.</p>
                    </div>
                </div>

                <div className="insight-card">
                    <div className="insight-icon">
                        <BarChart3 size={20} />
                    </div>
                    <div className="insight-text">
                        <h5>Pico de Actividad Detectado</h5>
                        <p>Se observa un aumento del 40% en tareas complejas entre las 14:00 y las 16:00. Se recomienda escalar workers en ese horario.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
