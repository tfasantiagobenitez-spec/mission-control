// [COPY-PASTE-SAFE]
// Archivo: src/components/ActivityLog.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EventWithAgent } from '@/lib/types'
import { Activity, User, Tag, Terminal, Info, AlertTriangle, CheckCircle, type LucideIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// We add some inline styles here that could also be moved to CommandCenter.css
// But keeping them here makes the component self-contained for its specific layout.
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '400px', // Fixed height with scroll for the feed
        overflowY: 'auto' as const,
    },
    loading: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '1rem',
        color: 'var(--text-muted)',
    },
    empty: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        textAlign: 'center' as const,
    },
    emptyIconWrap: {
        width: '4rem',
        height: '4rem',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1rem auto',
    },
    row: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background-color 0.2s ease',
    },
    iconBox: {
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '0.25rem'
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
    },
    title: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 900,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    time: {
        fontSize: '0.625rem',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap' as const,
    },
    summary: {
        margin: '0.25rem 0 0 0',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        fontWeight: 500,
    },
    metaGrid: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '0.75rem',
        marginTop: '0.75rem',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.625rem',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
    }
}

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
            <div style={styles.loading}>
                <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid var(--brand-blue)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
                <p style={{ fontSize: '0.875rem', fontWeight: 700 }} className="animate-pulse-soft">Rastreando eventos...</p>
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div style={styles.empty}>
                <div style={styles.emptyIconWrap}>
                    <Activity size={32} color="var(--text-muted)" />
                </div>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                    No hay actividad registrada
                </p>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            {events.map((event) => (
                <EventRow key={event.id} event={event} />
            ))}
        </div>
    )
}

function EventRow({ event }: { event: EventWithAgent }) {
    const kindConfig: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
        info: { color: 'var(--brand-blue)', bg: 'rgba(90, 156, 245, 0.1)', icon: Info },
        warning: { color: 'var(--brand-orange)', bg: 'rgba(229, 133, 15, 0.1)', icon: AlertTriangle },
        error: { color: 'var(--brand-red)', bg: 'rgba(217, 85, 85, 0.1)', icon: AlertTriangle },
        success: { color: 'var(--brand-green)', bg: 'rgba(46, 204, 143, 0.1)', icon: CheckCircle },
        action: { color: 'var(--brand-blue)', bg: 'rgba(90, 156, 245, 0.1)', icon: Terminal },
    }

    const config = kindConfig[event.kind] || kindConfig.info
    const Icon = config.icon

    return (
        <div style={styles.row} className="activity-row-hover">
            <div style={{ ...styles.iconBox, backgroundColor: config.bg, color: config.color }}>
                <Icon size={20} />
            </div>
            <div style={styles.content}>
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        {event.title}
                    </h3>
                    <span style={styles.time}>
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                    </span>
                </div>
                {event.summary && (
                    <p style={styles.summary}>
                        {event.summary}
                    </p>
                )}
                <div style={styles.metaGrid}>
                    <div style={styles.metaItem}>
                        <User size={12} />
                        {event.agents?.display_name || event.agents?.name || 'Sistema'}
                    </div>
                    {event.tags && event.tags.length > 0 && (
                        <div style={styles.metaItem}>
                            <Tag size={12} />
                            {event.tags.map(tag => (
                                <span key={tag} style={{ opacity: 0.7 }}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
