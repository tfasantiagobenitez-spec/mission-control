// [COPY-PASTE-SAFE]
// Archivo: src/components/ActivityLog.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EventWithAgent } from '@/lib/types'
import { Activity, Clock, User, Tag, Terminal, Info, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function ActivityLog() {
    const [events, setEvents] = useState<EventWithAgent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchEvents() {
            const { data, error } = await supabase
                .from('agent_events')
                .select('*, agents(*)')
                .order('created_at', { ascending: false })
                .limit(30)

            if (!error && data) {
                setEvents(data as EventWithAgent[])
            }
            setLoading(false)
        }

        fetchEvents()

        const channel = supabase
            .channel('events_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'agent_events' },
                () => fetchEvents()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center gap-4 text-slate-400">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold animate-pulse">Rastreando eventos...</p>
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay actividad registrada</p>
            </div>
        )
    }

    return (
        <div className="bg-white/40 dark:bg-slate-900/40 divide-y divide-slate-200 dark:divide-slate-800 rounded-[2.5rem] overflow-hidden">
            {events.map((event) => (
                <EventRow key={event.id} event={event} />
            ))}
        </div>
    )
}

function EventRow({ event }: { event: EventWithAgent }) {
    const kindConfig: Record<string, { color: string; bg: string; icon: any }> = {
        info: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Info },
        warning: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle },
        error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
        success: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
        action: { color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: Terminal },
    }

    const config = kindConfig[event.kind] || kindConfig.info
    const Icon = config.icon

    return (
        <div className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="flex items-start gap-4">
                <div className={`mt-1 w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center ${config.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight truncate">
                            {event.title}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                        </span>
                    </div>
                    {event.summary && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {event.summary}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            <User className="w-3 h-3" />
                            {event.agents?.display_name || event.agents?.name || 'Sistema'}
                        </div>
                        {event.tags && event.tags.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-slate-400" />
                                {event.tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold text-slate-400 tracking-tighter opacity-70">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
