// [COPY-PASTE-SAFE]
// Archivo: src/app/memory/page.tsx

'use client'

import {
    Brain,
    Search,
    Database,
    Zap,
    Target,
    Clock,
    Tag,
    Share2,
    Filter
} from 'lucide-react'
import './Memory.css'

export default function MemoryPage() {
    const memories = [
        {
            id: 'ENG-8821',
            text: 'Preferencias de usuario para el modo de visualización: El usuario prefiere Glassmorphism y Dark Mode con acentos naranjas.',
            agent: 'Alpha',
            time: 'Hace 2 horas',
            tags: ['Preferencia', 'UI'],
            confidence: 0.98
        },
        {
            id: 'ENG-8819',
            text: 'Error detectado en el módulo de sincronización: Conexión intermitente con la API de Supabase en la región us-east.',
            agent: 'Gamma',
            time: 'Hace 5 horas',
            tags: ['Debug', 'Supabase'],
            confidence: 0.92
        },
        {
            id: 'ENG-8815',
            text: 'Contexto de proyecto: Open Claw es una suite de herramientas para orquestación de agentes autónomos.',
            agent: 'System',
            time: 'Ayer',
            tags: ['Contexto', 'General'],
            confidence: 1.0
        },
        {
            id: 'ENG-8810',
            text: 'Instrucción recordada: El agente debe esperar aprobación manual antes de realizar cambios en archivos de configuración críticos.',
            agent: 'User-Defined',
            time: 'Ayer',
            tags: ['Regla', 'Autonomía'],
            confidence: 0.95
        }
    ]

    return (
        <div className="memory-page">
            <header className="memory-header">
                <div className="cc-eyebrow" style={{ color: 'var(--brand-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <Brain size={18} />
                    <span>Cognitive Repository</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Second Brain</h1>
                        <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.60)', marginTop: '0.5rem' }}>
                            Almacén semántico de experiencias y aprendizaje contextual.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.75rem 1.25rem', borderRadius: '1rem' }}>
                            <Share2 size={16} />
                            Exportar Cerebro
                        </button>
                    </div>
                </div>
            </header>

            <div className="memory-stats-grid">
                <div className="memory-stat-card">
                    <div className="memory-stat-icon">
                        <Database size={20} />
                    </div>
                    <div className="memory-stat-value">8,421</div>
                    <div className="memory-stat-label">Total Engrams</div>
                </div>
                <div className="memory-stat-card">
                    <div className="memory-stat-icon" style={{ background: 'rgba(229, 133, 15, 0.1)', color: 'var(--brand-orange)' }}>
                        <Target size={20} />
                    </div>
                    <div className="memory-stat-value">98.4%</div>
                    <div className="memory-stat-label">Recall Accuracy</div>
                </div>
                <div className="memory-stat-card">
                    <div className="memory-stat-icon" style={{ background: 'rgba(46, 204, 143, 0.1)', color: 'var(--brand-green)' }}>
                        <Zap size={20} />
                    </div>
                    <div className="memory-stat-value">24ms</div>
                    <div className="memory-stat-label">Semantic Speed</div>
                </div>
            </div>

            <div className="memory-search-container">
                <Search size={20} color="rgba(255, 255, 255, 0.38)" />
                <input
                    type="text"
                    className="memory-search-input"
                    placeholder="Search memories by context, keywords, or vector ID..."
                />
                <button className="btn-icon" style={{ padding: '0.5rem' }}>
                    <Filter size={18} color="rgba(255, 255, 255, 0.6)" />
                </button>
            </div>

            <div className="memory-vault">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Recent Engrams</h2>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.38)' }}>Mostrando 4 de 8,421</span>
                </div>

                {memories.map(engram => (
                    <div key={engram.id} className="engram-card">
                        <div className="engram-header">
                            <div className="engram-meta">
                                <span className="engram-id">{engram.id}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={12} />
                                    <span>{engram.time}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div className="agent-avatar-mini" style={{ width: '16px', height: '16px', fontSize: '10px' }}>{engram.agent[0]}</div>
                                    <span>{engram.agent}</span>
                                </div>
                            </div>
                            <div style={{ color: 'var(--brand-green)', fontSize: '0.75rem', fontWeight: 600 }}>
                                {Math.round(engram.confidence * 100)}% REL
                            </div>
                        </div>
                        <div className="engram-content">
                            {engram.text}
                        </div>
                        <div className="engram-tags">
                            {engram.tags.map(tag => (
                                <span key={tag} className="engram-tag">
                                    <Tag size={10} style={{ marginRight: '0.25rem' }} />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
