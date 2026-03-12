// [COPY-PASTE-SAFE]
// Archivo: src/app/settings/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Settings, Shield, Save, Eye, EyeOff, Brain, Cpu, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import './Settings.css'

interface ModelInfo {
    id: string
    name: string
    provider: string
    context_length: number
    pricing: { prompt: string; completion: string }
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('personality')
    const [showKey, setShowKey] = useState<Record<string, boolean>>({})
    const [models, setModels] = useState<ModelInfo[]>([])
    const [defaultModel, setDefaultModel] = useState('')
    const [selectedModel, setSelectedModel] = useState('')
    const [orStatus, setOrStatus] = useState<'loading' | 'connected' | 'error'>('loading')
    const [orError, setOrError] = useState('')
    const [totalModels, setTotalModels] = useState(0)
    const [testResult, setTestResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' })

    const toggleKey = (id: string) => {
        setShowKey(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // Load OpenRouter status and models
    useEffect(() => {
        async function loadOpenRouter() {
            try {
                const [statusRes, modelsRes] = await Promise.all([
                    fetch('/api/openrouter/status'),
                    fetch('/api/openrouter/models'),
                ])

                const statusData = await statusRes.json()
                const modelsData = await modelsRes.json()

                if (statusData.connected) {
                    setOrStatus('connected')
                } else {
                    setOrStatus('error')
                    setOrError(statusData.error || 'Not connected')
                }

                setDefaultModel(statusData.defaultModel || '')
                setSelectedModel(statusData.defaultModel || '')

                if (modelsData.success) {
                    setModels(modelsData.models || [])
                    setTotalModels(modelsData.totalAvailable || 0)
                }
            } catch (err: any) {
                setOrStatus('error')
                setOrError(err.message)
            }
        }
        loadOpenRouter()
    }, [])

    // Test model with a quick message
    async function testModel() {
        setTestResult({ status: 'loading', message: 'Enviando mensaje de prueba...' })
        try {
            const res = await fetch('/api/openrouter/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: 'user', content: 'Responde solo con: "OpenRouter conectado correctamente desde Mission Control 🚀"' }],
                    max_tokens: 100,
                }),
            })
            const data = await res.json()
            if (data.success && data.choices?.[0]) {
                setTestResult({ status: 'success', message: data.choices[0].message.content })
            } else {
                setTestResult({ status: 'error', message: data.error || 'Error desconocido' })
            }
        } catch (err: any) {
            setTestResult({ status: 'error', message: err.message })
        }
    }

    // Group models by provider
    const groupedModels = models.reduce<Record<string, ModelInfo[]>>((acc, model) => {
        if (!acc[model.provider]) acc[model.provider] = []
        acc[model.provider].push(model)
        return acc
    }, {})

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div className="cc-eyebrow" style={{ color: 'var(--brand-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <Settings size={18} />
                    <span>System Configuration</span>
                </div>
                <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Settings</h1>
                <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.60)', marginTop: '0.5rem' }}>
                    Personaliza el comportamiento, la identidad y las credenciales de tu agente.
                </p>
            </header>

            <nav className="settings-tabs">
                <button
                    className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`settings-tab ${activeTab === 'personality' ? 'active' : ''}`}
                    onClick={() => setActiveTab('personality')}
                >
                    Personality
                </button>
                <button
                    className={`settings-tab ${activeTab === 'openrouter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('openrouter')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Zap size={14} />
                    OpenRouter
                    {orStatus === 'connected' && (
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'var(--brand-green)', display: 'inline-block',
                        }} />
                    )}
                </button>
                <button
                    className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    Security & API
                </button>
            </nav>

            <div className="settings-content">
                {activeTab === 'personality' && (
                    <div className="settings-grid">
                        <div className="settings-section-info">
                            <h2 className="settings-section-title">Identity & Character</h2>
                            <p className="settings-section-desc">
                                Define cómo se presenta el agente y cuál es su tono de interacción preferido.
                            </p>
                            <div style={{ marginTop: '2rem', color: 'var(--brand-blue)', opacity: 0.5 }}>
                                <Brain size={48} strokeWidth={1} />
                            </div>
                        </div>

                        <div className="premium-card">
                            <div className="settings-form-content">
                                <div className="form-group">
                                    <label className="form-label">
                                        Agent Name
                                        <span className="form-label-hint">Visible in logs</span>
                                    </label>
                                    <input type="text" className="form-input" placeholder="e.g. Arreco Prime" defaultValue="Claude Project Alpha" />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Base Role & Persona</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Describe el propósito central del agente..."
                                        defaultValue="Eres un asistente técnico experto en orquestación de flotas de IA y automatización. Tu tono es preciso, profesional y siempre orientado a la eficiencia."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Core Traits</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-slider-container">
                                            <div className="form-label">
                                                Creativity
                                                <span className="form-label-hint">Temp: 0.7</span>
                                            </div>
                                            <input type="range" className="form-slider" min="0" max="100" defaultValue="70" />
                                            <div className="slider-marks">
                                                <span>Precise</span>
                                                <span>Creative</span>
                                            </div>
                                        </div>
                                        <div className="form-slider-container">
                                            <div className="form-label">
                                                Autonomy
                                                <span className="form-label-hint">High</span>
                                            </div>
                                            <input type="range" className="form-slider" min="0" max="100" defaultValue="85" />
                                            <div className="slider-marks">
                                                <span>Passive</span>
                                                <span>Agentic</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="form-toggle">
                                        <div className="toggle-info">
                                            <span className="toggle-title">Interactive Mode</span>
                                            <span className="toggle-desc">Permitir que el agente pida aclaraciones proactivamente.</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-toggle">
                                        <div className="toggle-info">
                                            <span className="toggle-title">Memory Retention</span>
                                            <span className="toggle-desc">Uso agresivo del Second Brain para contexto a largo plazo.</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-actions">
                                <button className="btn-secondary">Restablecer</button>
                                <button className="btn-primary">
                                    <Save size={18} />
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── OpenRouter Tab ── */}
                {activeTab === 'openrouter' && (
                    <div className="settings-grid">
                        <div className="settings-section-info">
                            <h2 className="settings-section-title">OpenRouter Multi-Model</h2>
                            <p className="settings-section-desc">
                                Accede a cientos de modelos de IA a través de una sola API.
                                Cambia entre proveedores sin fricción.
                            </p>
                            <div style={{ marginTop: '1rem' }}>
                                <div className="or-status-badge" data-status={orStatus}>
                                    {orStatus === 'loading' && <Loader2 size={14} className="animate-spin" />}
                                    {orStatus === 'connected' && <CheckCircle size={14} />}
                                    {orStatus === 'error' && <XCircle size={14} />}
                                    <span>
                                        {orStatus === 'loading' && 'Verificando...'}
                                        {orStatus === 'connected' && 'Conectado'}
                                        {orStatus === 'error' && (orError || 'Error')}
                                    </span>
                                </div>
                                {totalModels > 0 && (
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: '0.5rem' }}>
                                        {totalModels} modelos disponibles en OpenRouter
                                    </p>
                                )}
                            </div>
                            <div style={{ marginTop: '1rem', color: 'var(--brand-orange)', opacity: 0.5 }}>
                                <Zap size={48} strokeWidth={1} />
                            </div>
                        </div>

                        <div className="premium-card">
                            <div className="settings-form-content">
                                {/* Connection Info */}
                                <div className="form-group">
                                    <label className="form-label">
                                        API Key
                                        <span className="form-label-hint">Configurada en .env.local</span>
                                    </label>
                                    <div className="input-with-action">
                                        <input
                                            type={showKey['openrouter'] ? 'text' : 'password'}
                                            className="form-input"
                                            readOnly
                                            value="sk-or-v1-••••••••••••••••••••"
                                        />
                                        <button className="input-action-btn" onClick={() => toggleKey('openrouter')}>
                                            {showKey['openrouter'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Model Selector */}
                                <div className="form-group">
                                    <label className="form-label">
                                        Modelo Activo
                                        <span className="form-label-hint">
                                            Default: {defaultModel}
                                        </span>
                                    </label>
                                    <select
                                        className="form-input form-select"
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                    >
                                        {Object.entries(groupedModels).map(([provider, providerModels]) => (
                                            <optgroup key={provider} label={provider}>
                                                {providerModels.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name} {m.context_length ? `(${(m.context_length / 1000).toFixed(0)}k ctx)` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* Selected Model Info */}
                                {selectedModel && (
                                    <div className="or-model-info">
                                        <div className="or-model-chip">
                                            <Cpu size={14} />
                                            <span>{selectedModel}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Test Button */}
                                <div className="form-group">
                                    <button
                                        className="btn-primary"
                                        onClick={testModel}
                                        disabled={testResult.status === 'loading' || orStatus !== 'connected'}
                                        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                                    >
                                        {testResult.status === 'loading' ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Zap size={18} />
                                        )}
                                        Probar Modelo
                                    </button>
                                </div>

                                {/* Test Result */}
                                {testResult.status !== 'idle' && testResult.status !== 'loading' && (
                                    <div className={`or-test-result ${testResult.status}`}>
                                        {testResult.status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="settings-grid">
                        <div className="settings-section-info">
                            <h2 className="settings-section-title">Credentials & Keys</h2>
                            <p className="settings-section-desc">
                                Gestiona las llaves de API necesarias para que el agente acceda a servicios externos.
                            </p>
                            <div style={{ marginTop: '2rem', color: 'var(--brand-orange)', opacity: 0.5 }}>
                                <Shield size={48} strokeWidth={1} />
                            </div>
                        </div>

                        <div className="premium-card">
                            <div className="settings-form-content">
                                <div className="form-group">
                                    <label className="form-label">OpenAI API Key</label>
                                    <div className="input-with-action">
                                        <input
                                            type={showKey['openai'] ? 'text' : 'password'}
                                            className="form-input"
                                            defaultValue="sk-proj-......................."
                                        />
                                        <button className="input-action-btn" onClick={() => toggleKey('openai')}>
                                            {showKey['openai'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Anthropic API Key</label>
                                    <div className="input-with-action">
                                        <input
                                            type={showKey['anthropic'] ? 'text' : 'password'}
                                            className="form-input"
                                            defaultValue="sk-ant-......................."
                                        />
                                        <button className="input-action-btn" onClick={() => toggleKey('anthropic')}>
                                            {showKey['anthropic'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Pinecone Environment</label>
                                    <input type="text" className="form-input" defaultValue="us-east-1-gcp" />
                                </div>
                            </div>

                            <div className="settings-actions" style={{ marginTop: '2rem' }}>
                                <button className="btn-primary">
                                    <Shield size={18} />
                                    Actualizar Credenciales
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="settings-grid">
                        <div className="settings-section-info">
                            <h2 className="settings-section-title">General Preferences</h2>
                            <p className="settings-section-desc">
                                Configuración global del dashboard y notificaciones del sistema.
                            </p>
                        </div>
                        <div className="premium-card">
                            <div className="settings-form-content">
                                <p style={{ color: 'rgba(255, 255, 255, 0.38)', fontSize: '0.875rem' }}>
                                    Configuración de tema y lenguaje próximamente...
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
