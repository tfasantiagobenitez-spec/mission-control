'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Brain, TrendingUp, DollarSign, ShieldAlert, Zap, Eye,
    RefreshCw, ChevronDown, ChevronRight, AlertTriangle,
    Rocket, Target, Activity, Clock, CheckCircle2, Loader2
} from 'lucide-react'
import type { CouncilResult, AgentOutput, DecisionLog } from '@/lib/advisory/types'

// ── Agent metadata ────────────────────────────────────────────────────────

const AGENT_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    'Project Thinker':    { icon: Brain,       color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
    'Growth Strategist':  { icon: TrendingUp,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    'Revenue Guardian':   { icon: DollarSign,  color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
    'Risk Analyst':       { icon: ShieldAlert, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
    'Execution Planner':  { icon: Zap,         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
    'Skeptical Operator': { icon: Eye,         color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
}

// ── Health Score Ring ─────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
    const pct = (score / 10) * 100
    const color = score >= 8 ? '#22c55e' : score >= 5 ? '#eab308' : '#ef4444'
    const radius = 54
    const circ = 2 * Math.PI * radius
    const dash = (pct / 100) * circ

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
                    <circle
                        cx="64" cy="64" r={radius} fill="none"
                        stroke={color} strokeWidth="12"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{score}</span>
                    <span className="text-xs text-slate-400 font-medium">/10</span>
                </div>
            </div>
            <span className="text-sm font-semibold text-slate-300">Project Health</span>
        </div>
    )
}

// ── Agent Card ────────────────────────────────────────────────────────────

function AgentCard({ output }: { output: AgentOutput }) {
    const [open, setOpen] = useState(false)
    const meta = AGENT_META[output.agent] ?? { icon: Brain, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
    const Icon = meta.icon

    return (
        <div className={`rounded-2xl border p-4 ${meta.bg} transition-all`}>
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg} border ${meta.bg.split(' ')[1]}`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <span className={`font-bold text-sm ${meta.color}`}>{output.agent}</span>
                    <span className="text-xs text-slate-500">{output.insights.length} insights · {output.recommendations.length} recs</span>
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {open && (
                <div className="mt-4 space-y-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Insights</p>
                        <ul className="space-y-1">
                            {output.insights.map((ins, i) => (
                                <li key={i} className="text-sm text-slate-300 flex gap-2">
                                    <span className="text-slate-500 shrink-0">•</span>
                                    {ins}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Recommendations</p>
                        <ul className="space-y-1">
                            {output.recommendations.map((rec, i) => (
                                <li key={i} className="text-sm text-slate-300 flex gap-2">
                                    <span className="text-emerald-400 shrink-0">→</span>
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Decision Row ──────────────────────────────────────────────────────────

function DecisionRow({ d }: { d: DecisionLog }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0">
            <CheckCircle2 className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 leading-snug">{d.recommendation}</p>
                {d.action_taken && (
                    <p className="text-xs text-blue-400 mt-1">→ {d.action_taken}</p>
                )}
                {d.outcome && (
                    <p className="text-xs text-emerald-400 mt-0.5">✓ {d.outcome}</p>
                )}
            </div>
            <time className="text-xs text-slate-600 shrink-0 whitespace-nowrap">
                {d.created_at ? new Date(d.created_at).toLocaleDateString('es-AR') : '—'}
            </time>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AdvisoryCouncilPage() {
    const [project, setProject] = useState('Arecco IA')
    const [inputProject, setInputProject] = useState('Arecco IA')
    const [lastRun, setLastRun] = useState<CouncilResult | null>(null)
    const [decisions, setDecisions] = useState<DecisionLog[]>([])
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [running, setRunning] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchResults = useCallback(async (proj: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/advisory/results?project=${encodeURIComponent(proj)}`)
            if (!res.ok) throw new Error('Failed to fetch results')
            const data = await res.json()
            setLastRun(data.last_run)
            setDecisions(data.decisions || [])
            setLastUpdated(data.last_updated)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchResults(project)
    }, [project, fetchResults])

    async function triggerCouncil() {
        setRunning(true)
        setError(null)
        try {
            const res = await fetch('/api/advisory/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Council run failed')
            }
            await fetchResults(project)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setRunning(false)
        }
    }

    const synthesis = lastRun?.synthesis
    const score = synthesis?.project_health_score ?? 0

    return (
        <div className="space-y-8 pb-20">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-violet-500" />
                        <span className="text-sm font-bold tracking-widest uppercase text-violet-500">
                            Decision Engine
                        </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                        AI Advisory Council
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl">
                        6 agentes independientes analizan tu proyecto y sintetizan un plan de acción.
                    </p>
                </div>

                {/* Project selector + Run button */}
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={inputProject}
                        onChange={e => setInputProject(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') setProject(inputProject) }}
                        placeholder="Nombre del proyecto..."
                        className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                        onClick={() => setProject(inputProject)}
                        disabled={loading}
                        className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={triggerCouncil}
                        disabled={running}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-lg shadow-violet-500/20"
                    >
                        {running
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</>
                            : <><Brain className="w-4 h-4" /> Ejecutar Council</>
                        }
                    </button>
                </div>
            </header>

            {error && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {running && (
                <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 px-4 py-4 text-violet-300 text-sm flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <div>
                        <p className="font-semibold">Ejecutando los 6 agentes en paralelo...</p>
                        <p className="text-violet-400/70 text-xs mt-0.5">Esto puede tardar entre 30 y 60 segundos. También recibirás el reporte en Telegram.</p>
                    </div>
                </div>
            )}

            {!lastRun && !loading && !running && (
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
                    <Brain className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No hay análisis previo para <span className="text-white font-bold">{project}</span></p>
                    <p className="text-slate-600 text-sm mt-1">Hacé clic en "Ejecutar Council" para generar el primer análisis.</p>
                </div>
            )}

            {lastRun && synthesis && (
                <>
                    {/* Last run meta */}
                    {lastUpdated && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            Último análisis: {new Date(lastUpdated).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                        </div>
                    )}

                    {/* KPI row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                        {/* Health score */}
                        <div className="md:col-span-1 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex items-center justify-center">
                            <HealthRing score={score} />
                        </div>

                        {/* Top stats */}
                        <div className="md:col-span-3 grid grid-cols-3 gap-4">
                            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-blue-400 mb-1">
                                    <Target className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Top Actions</span>
                                </div>
                                <span className="text-4xl font-black text-white">{synthesis.top_actions.length}</span>
                                <span className="text-xs text-slate-500">acciones priorizadas</span>
                            </div>
                            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-red-400 mb-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Risks</span>
                                </div>
                                <span className="text-4xl font-black text-white">{synthesis.risks.length}</span>
                                <span className="text-xs text-slate-500">riesgos identificados</span>
                            </div>
                            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                    <Rocket className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Opportunities</span>
                                </div>
                                <span className="text-4xl font-black text-white">{synthesis.opportunities.length}</span>
                                <span className="text-xs text-slate-500">oportunidades detectadas</span>
                            </div>
                        </div>
                    </div>

                    {/* Strategic direction */}
                    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-5 h-5 text-violet-400" />
                            <h2 className="font-bold text-white">Dirección Estratégica</h2>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{synthesis.strategic_direction}</p>
                    </div>

                    {/* Actions + Risks + Opportunities */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Top actions */}
                        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="w-5 h-5 text-blue-400" />
                                <h2 className="font-bold text-white">Top Actions</h2>
                            </div>
                            <ol className="space-y-3">
                                {synthesis.top_actions.map((a, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">{i + 1}</span>
                                        {a}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Risks */}
                        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <h2 className="font-bold text-white">Riesgos</h2>
                            </div>
                            <ul className="space-y-3">
                                {synthesis.risks.map((r, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                                        <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Opportunities */}
                        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Rocket className="w-5 h-5 text-emerald-400" />
                                <h2 className="font-bold text-white">Oportunidades</h2>
                            </div>
                            <ul className="space-y-3">
                                {synthesis.opportunities.map((o, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                                        <span className="text-emerald-400 shrink-0">→</span>
                                        {o}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Agent outputs */}
                    <div>
                        <h2 className="font-black text-xl text-white mb-4">Outputs por Agente</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lastRun.agent_outputs.map(output => (
                                <AgentCard key={output.agent} output={output} />
                            ))}
                        </div>
                    </div>

                    {/* Project snapshot */}
                    <details className="group rounded-3xl bg-slate-900 border border-slate-800 p-6">
                        <summary className="cursor-pointer flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors list-none font-semibold text-sm select-none">
                            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                            Ver Project Snapshot completo
                        </summary>
                        <pre className="mt-4 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-mono">{lastRun.snapshot.summary}</pre>
                    </details>
                </>
            )}

            {/* Decision history */}
            {decisions.length > 0 && (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-slate-400" />
                        <h2 className="font-bold text-white">Historial de Decisiones</h2>
                        <span className="text-xs text-slate-500 ml-1">({decisions.length} registros)</span>
                    </div>
                    <div>
                        {decisions.map(d => (
                            <DecisionRow key={d.id} d={d} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
