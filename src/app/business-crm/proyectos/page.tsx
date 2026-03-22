'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, ChevronLeft, Building2, CheckCircle2, Clock, Circle } from 'lucide-react'
import Link from 'next/link'

type Task = {
    id: string
    title: string
    status: string
    deadline: string | null
}

type Project = {
    id: string
    name: string
    description: string | null
    status: 'active' | 'completed' | 'pending'
    created_at: string
    clients: { name: string } | null
    tasks: Task[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    completed: { label: 'Completado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
    pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
}

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
    done: <CheckCircle2 size={12} className="text-emerald-400" />,
    completed: <CheckCircle2 size={12} className="text-emerald-400" />,
    in_progress: <Clock size={12} className="text-blue-400" />,
    pending: <Circle size={12} className="text-slate-500" />,
}

export default function ProyectosPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/business-crm/projects')
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d)) {
                    setProjects(d)
                } else if (d?.error) {
                    setError(d.error)
                } else {
                    setProjects([])
                }
                setLoading(false)
            })
            .catch(e => { setError(String(e)); setLoading(false) })
    }, [])

    const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter)

    const counts = {
        all: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        pending: projects.filter(p => p.status === 'pending').length,
        completed: projects.filter(p => p.status === 'completed').length,
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-8">
            <div className="mb-6">
                <Link href="/business-crm" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                    <ChevronLeft size={14} /> Business CRM
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <FolderOpen size={20} className="text-violet-400" />
                    <h1 className="text-3xl font-black text-white">Proyectos</h1>
                </div>
                <p className="text-slate-400 text-sm">Estado, tareas y entregas</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {(['all', 'active', 'pending', 'completed'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            statusFilter === s
                                ? 'bg-violet-600 border-violet-500 text-white'
                                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
                        }`}
                    >
                        {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label}
                        <span className="ml-1.5 opacity-60">{counts[s]}</span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl h-40 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <FolderOpen size={40} className="mx-auto mb-3 opacity-30 text-red-400" />
                    <p className="text-red-400 text-sm font-medium mb-1">Error al cargar proyectos</p>
                    <p className="text-slate-500 text-xs font-mono max-w-lg mx-auto">{error}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No hay proyectos en este estado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(p => {
                        const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending
                        const tasks = p.tasks || []
                        const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed').length
                        const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

                        return (
                            <div key={p.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-colors">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-base truncate">{p.name}</h3>
                                        {p.clients && (
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                                                <Building2 size={11} /> {p.clients.name}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.color}`}>
                                        {cfg.label}
                                    </span>
                                </div>

                                {p.description && (
                                    <p className="text-slate-400 text-xs mb-3 line-clamp-2">{p.description}</p>
                                )}

                                {/* Progress */}
                                {tasks.length > 0 && (
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>{doneTasks}/{tasks.length} tareas</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-violet-500 transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Recent tasks */}
                                {tasks.length > 0 && (
                                    <div className="space-y-1">
                                        {tasks.slice(0, 3).map(t => (
                                            <div key={t.id} className="flex items-center gap-2 text-xs text-slate-400">
                                                {TASK_STATUS_ICON[t.status] ?? <Circle size={12} className="text-slate-600" />}
                                                <span className="truncate flex-1">{t.title}</span>
                                                {t.deadline && (
                                                    <span className="text-slate-600 flex-shrink-0">
                                                        {new Date(t.deadline).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {tasks.length > 3 && (
                                            <p className="text-xs text-slate-600 pl-5">+{tasks.length - 3} más</p>
                                        )}
                                    </div>
                                )}

                                <p className="text-slate-600 text-xs mt-3">
                                    Creado {new Date(p.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
