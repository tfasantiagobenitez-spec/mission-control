'use client'

import { useState, useEffect, Suspense } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Bot, Sparkles, Clock, MapPin, ArrowLeft, Link2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import './CalendarControl.css'

export default function CalendarControlPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-500">Cargando...</div>}>
            <CalendarControlInner />
        </Suspense>
    )
}

function CalendarControlInner() {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])
    const [justConnected, setJustConnected] = useState<string | null>(null)
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        meetingType: 'none',
        guestEmail: ''
    })

    const searchParams = useSearchParams()

    useEffect(() => {
        // Check if just returned from OAuth
        const connected = searchParams.get('connected')
        if (connected) {
            setJustConnected(connected)
            setTimeout(() => setJustConnected(null), 5000)
        }
        fetchEvents()
        fetchConnectedAccounts()
    }, [])

    async function fetchConnectedAccounts() {
        try {
            const res = await fetch('/api/auth/google/accounts')
            if (res.ok) {
                const data = await res.json()
                setConnectedAccounts(data.accounts || [])
            }
        } catch (_) { /* silently ignore */ }
    }

    async function fetchEvents() {
        setLoading(true)
        try {
            const res = await fetch('/api/agents/calendar')
            const data = await res.json()
            if (data.events) {
                setEvents(data.events)
            }
        } catch (err) {
            console.error('Error fetching calendar:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateEvent() {
        if (!newEvent.title || !newEvent.date || !newEvent.time) return
        setIsCreating(true)
        try {
            // Robust date parsing
            const [year, month, day] = newEvent.date.split('-').map(Number)
            const [hours, minutes] = newEvent.time.split(':').map(Number)

            const startDateTime = new Date(year, month - 1, day, hours, minutes)

            if (isNaN(startDateTime.getTime())) {
                throw new Error('Fecha o hora inválida')
            }

            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // 1h duration

            const res = await fetch('/api/agents/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newEvent.title,
                    description: newEvent.description,
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                    meetingType: newEvent.meetingType,
                    guestEmail: newEvent.guestEmail
                })
            })

            if (res.ok) {
                setIsModalOpen(false)
                setNewEvent({
                    title: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '10:00',
                    meetingType: 'none',
                    guestEmail: ''
                })
                fetchEvents()
            }
        } catch (err) {
            console.error('Error creating event:', err)
        } finally {
            setIsCreating(false)
        }
    }

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))

    const renderHeader = () => {
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        return (
            <div className="calendar-header">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black tracking-tight">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight size={18} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/api/auth/google?agent=calendar"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-slate-300"
                    >
                        <Link2 size={14} className="text-indigo-400" />
                        {connectedAccounts.length > 0 ? `+Cuenta Google` : 'Conectar Google'}
                    </a>
                    <button
                        className="btn-calendar-add"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus size={18} />
                        <span>Nuevo Evento</span>
                    </button>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
        return (
            <div className="calendar-days-grid">
                {days.map(d => <div key={d} className="calendar-day-label">{d}</div>)}
            </div>
        )
    }

    const renderCells = () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const totalDays = daysInMonth(year, month)
        const firstDay = firstDayOfMonth(year, month)
        const cells = []

        // Empty cells for first week
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>)
        }

        // Day cells
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d)
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = date.toDateString() === selectedDate.toDateString()

            const dayEvents = events.filter(e => {
                const checkDate = e.start || e.end
                if (!checkDate) return false
                return new Date(checkDate).toDateString() === date.toDateString()
            })

            cells.push(
                <div
                    key={d}
                    className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(date)}
                >
                    <span className="day-number">{d}</span>
                    <div className="event-list">
                        {dayEvents.slice(0, 3).map(e => (
                            <div
                                key={e.id}
                                className={`event-dot ${e.source === 'google' ? 'source-google' : `status-${(e.status || 'todo').toLowerCase().replace(' ', '-')}`}`}
                                title={`${e.title} (${e.account})`}
                            />
                        ))}
                    </div>
                </div>
            )
        }

        return <div className="calendar-cells-grid">{cells}</div>
    }

    return (
        <div className="agent-page-container">
            {/* Success banner after OAuth connect */}
            {justConnected && (
                <div className="mb-4 px-5 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-2">
                    <span>✅</span>
                    <span>Google Calendar conectado: <strong>{justConnected}</strong> — los eventos ya deben aparecer.</span>
                </div>
            )}
            {/* Connected accounts indicator */}
            {connectedAccounts.length > 0 && !justConnected && (
                <div className="mb-4 px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <span className="text-indigo-400">🔗</span>
                    <span>Google Calendar activo:</span>
                    {connectedAccounts.map(email => (
                        <span key={email} className="px-2 py-0.5 bg-indigo-500/20 rounded-lg text-indigo-300">{email}</span>
                    ))}
                </div>
            )}
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link href="/agents" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4 group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver a la Flota
                    </Link>
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <CalendarIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                                Calendar Control
                                <span className="text-indigo-500 text-base font-bold px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">AGENT</span>
                            </h1>
                            <p className="text-slate-400 font-medium tracking-tight">Consolidated Scheduling Intelligence</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
                {/* Calendar View */}
                <div className="col-span-8 glass-panel overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        {renderHeader()}
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                        {renderDays()}
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
                                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Calendarios...</span>
                            </div>
                        ) : renderCells()}
                    </div>
                </div>

                {/* Agenda / Intel View */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="glass-panel flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/2">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} className="text-indigo-500" />
                                Agenda del Día
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">
                                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {events.filter(e => {
                                const checkDate = e.start || e.end
                                return checkDate && new Date(checkDate).toDateString() === selectedDate.toDateString()
                            }).length > 0 ? (
                                <div className="space-y-4">
                                    {events.filter(e => {
                                        const checkDate = e.start || e.end
                                        return checkDate && new Date(checkDate).toDateString() === selectedDate.toDateString()
                                    }).map(e => (
                                        <div key={e.id} className="agenda-item group">
                                            <div className="flex items-start gap-4">
                                                <div className={`status-indicator ${e.source === 'google' ? 'source-google' : `status-${(e.status || 'todo').toLowerCase().replace(' ', '-')}`}`} />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{e.title}</h4>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-tighter">
                                                            {e.source === 'google' ? '📅' : <MapPin size={10} />} {e.account}
                                                        </span>
                                                        {e.source !== 'google' && (
                                                            <span className={`badge-priority priority-${e.priority}`}>
                                                                {e.priority}
                                                            </span>
                                                        )}
                                                        {e.meetLink && (
                                                            <a href={e.meetLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-tighter">🎥 Meet</a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-3">
                                    <CalendarIcon size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sin eventos programados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="intel-panel glass-panel p-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Bot className="w-5 h-5 text-indigo-400" />
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-100">AI Scheduling Optimus</h4>
                            <Sparkles className="ml-auto w-4 h-4 text-indigo-500 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4 py-1">
                            "He analizado tu semana. Tienes 3 espacios óptimos para tareas de alta concentración el martes por la tarde."
                        </p>
                    </div>
                </div>
            </div>

            {/* New Event Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel p-8 w-full max-w-lg animate-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                                <Plus className="text-indigo-500" />
                                Nuevo Evento
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Título del Evento</label>
                                <input
                                    type="text"
                                    className="calendar-input"
                                    placeholder="Ej: Reunión de Equipo"
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha</label>
                                    <input
                                        type="date"
                                        className="calendar-input"
                                        value={newEvent.date}
                                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hora</label>
                                    <input
                                        type="time"
                                        className="calendar-input"
                                        value={newEvent.time}
                                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Integración de Reunión</label>
                                <div className="flex gap-2">
                                    {['none', 'meet', 'zoom'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewEvent({ ...newEvent, meetingType: type })}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${newEvent.meetingType === type
                                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/10'
                                                : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email del Invitado</label>
                                <input
                                    type="email"
                                    className="calendar-input"
                                    placeholder="invitado@ejemplo.com"
                                    value={newEvent.guestEmail}
                                    onChange={(e) => setNewEvent({ ...newEvent, guestEmail: e.target.value })}
                                />
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Se enviará invitación vía ClickUp Inbox</p>
                            </div>

                            <button
                                onClick={handleCreateEvent}
                                disabled={isCreating || !newEvent.title}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span className="font-black uppercase tracking-widest text-sm">Crear Evento</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
