// [COPY-PASTE-SAFE]
// Archivo: src/app/tasks/page.tsx

'use client'
import { useState, useEffect } from 'react'
import {
    CheckSquare,
    Clock,
    Plus,
    Calendar
} from 'lucide-react'
import './Tasks.css'

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newTaskName, setNewTaskName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    async function fetchTasks() {
        try {
            const response = await fetch('/api/clickup/tasks')
            const data = await response.json()
            if (data.tasks) {
                const mappedTasks = data.tasks.map((t: any) => ({
                    id: t.id,
                    title: t.name,
                    priority: t.priority?.priority === 'urgent' ? 'critical' : t.priority?.priority === 'high' ? 'high' : t.priority?.priority === 'normal' ? 'medium' : t.priority?.priority === 'low' ? 'low' : 'medium',
                    tags: t.tags?.map((tag: any) => tag.name) || [],
                    agent: t.assignees?.[0]?.username || 'Sistema',
                    due: t.due_date ? new Date(parseInt(t.due_date)).toLocaleDateString() : 'N/A',
                    status: t.status.status.toLowerCase().replace(' ', '-')
                }))
                setTasks(mappedTasks)
            }
        } catch (error) {
            console.error('Error fetching tasks from ClickUp:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const handleAddTask = async () => {
        if (!newTaskName.trim()) return

        setIsCreating(true)
        try {
            const response = await fetch('/api/clickup/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTaskName })
            })

            if (response.ok) {
                setNewTaskName('')
                setIsModalOpen(false)
                fetchTasks() // Refrescar lista
            }
        } catch (error) {
            console.error('Error creating task:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const getTasksByStatus = (status: string) => tasks.filter(t => t.status.includes(status))

    const columns = [
        { id: 'pendiente', title: 'Pendiente', icon: <CheckSquare size={16} />, color: 'var(--brand-blue)' },
        { id: 'en-curso', title: 'En Curso', icon: <Clock size={16} />, color: 'var(--brand-orange)' },
        { id: 'completado', title: 'Completado', icon: <Plus size={16} style={{ transform: 'rotate(45deg)' }} />, color: 'var(--brand-green)' }
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
                    <button
                        className="btn-primary"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '1rem' }}
                        onClick={() => setIsModalOpen(true)}
                    >
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
                            {getTasksByStatus(col.id).map((task: any) => (
                                <div key={task.id} className={`task-card priority-${task.priority}`}>
                                    <div className="task-priority-bar"></div>
                                    <div className="task-tags">
                                        {task.tags.map((tag: string) => (
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

            {/* Modal de Nueva Tarea */}
            {isModalOpen && (
                <div className="task-modal-overlay">
                    <div className="task-modal-content">
                        <h2 className="task-modal-title">
                            <Plus size={20} />
                            Nueva Misión en ClickUp
                        </h2>
                        <div className="task-form-group">
                            <label className="task-form-label">Nombre de la Tarea</label>
                            <input
                                type="text"
                                className="task-input"
                                placeholder="Ej: Comprar provisiones..."
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            />
                        </div>
                        <div className="task-modal-actions">
                            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAddTask}
                                disabled={isCreating || !newTaskName.trim()}
                            >
                                {isCreating ? 'Creando...' : 'Crear Tarea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

