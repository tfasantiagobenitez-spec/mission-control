// [COPY-PASTE-SAFE]
// Archivo: src/app/tasks/page.tsx

'use client'

import {
    CheckSquare,
    Clock,
    Plus,
    Calendar
} from 'lucide-react'
import './Tasks.css'

export default function TasksPage() {
    const tasks = [
        {
            id: 'T-1',
            title: 'Optimizar flujo de datos en Content Intel',
            priority: 'critical',
            tags: ['Backend', 'Performance'],
            agent: 'Alpha',
            due: 'Hoy',
            status: 'todo'
        },
        {
            id: 'T-2',
            title: 'Refactorizar Sidebar para movilidad',
            priority: 'high',
            tags: ['UI/UX', 'Mobile'],
            agent: 'Beta',
            due: 'Mañana',
            status: 'in-progress'
        },
        {
            id: 'T-3',
            title: 'Actualizar documentación de API',
            priority: 'medium',
            tags: ['Docs'],
            agent: 'Alpha',
            due: '2 Mar',
            status: 'todo'
        },
        {
            id: 'T-4',
            title: 'Sincronizar base de datos con Supabase',
            priority: 'low',
            tags: ['Data'],
            agent: 'Gamma',
            due: 'Completado',
            status: 'completed'
        },
        {
            id: 'T-5',
            title: 'Implementar búsqueda global',
            priority: 'high',
            tags: ['Search', 'Feature'],
            agent: 'Beta',
            due: '4 Mar',
            status: 'todo'
        }
    ]

    const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status)

    const columns = [
        { id: 'todo', title: 'To Do', icon: <CheckSquare size={16} />, color: 'var(--brand-blue)' },
        { id: 'in-progress', title: 'In Progress', icon: <Clock size={16} />, color: 'var(--brand-orange)' },
        { id: 'completed', title: 'Completed', icon: <Plus size={16} style={{ transform: 'rotate(45deg)' }} />, color: 'var(--brand-green)' }
    ]

    return (
        <div className="tasks-page">
            <header className="tasks-header">
                <div className="cc-eyebrow" style={{ color: 'var(--brand-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <CheckSquare size={18} />
                    <span>Gestión de Misiones</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="cc-title" style={{ fontSize: '2rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.87)', margin: 0 }}>Task Board</h1>
                        <p className="cc-subtitle" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.60)', marginTop: '0.5rem' }}>
                            Orquestación y seguimiento de objetivos en tiempo real.
                        </p>
                    </div>
                    <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '1rem' }}>
                        <Plus size={18} />
                        Nueva Tarea
                    </button>
                </div>
            </header>

            <div className="kanban-board">
                {columns.map(col => (
                    <div key={col.id} className="kanban-column">
                        <div className="column-header">
                            <span className="column-title" style={{ color: col.color }}>
                                {col.icon}
                                {col.title}
                            </span>
                            <span className="task-count">{getTasksByStatus(col.id).length}</span>
                        </div>
                        <div className="column-content">
                            {getTasksByStatus(col.id).map(task => (
                                <div key={task.id} className={`task-card priority-${task.priority}`}>
                                    <div className="task-priority-bar"></div>
                                    <div className="task-tags">
                                        {task.tags.map(tag => (
                                            <span key={tag} className="task-tag">{tag}</span>
                                        ))}
                                    </div>
                                    <h3 className="task-title">{task.title}</h3>
                                    <div className="task-footer">
                                        <div className="task-agent">
                                            <div className="agent-avatar-mini">{task.agent[0]}</div>
                                            <span>{task.agent}</span>
                                        </div>
                                        <div className="task-due">
                                            <Calendar size={12} />
                                            {task.due}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
