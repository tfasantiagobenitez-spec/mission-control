// [COPY-PASTE-SAFE]
// Archivo: src/components/MissionsList.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MissionWithAgent } from '@/lib/types'
import { Rocket, CheckCircle2, XCircle, Clock, PlayCircle, AlertCircle, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function MissionsList() {
    const [missions, setMissions] = useState<MissionWithAgent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchMissions() {
            const { data, error } = await supabase
                .from('missions')
                .select('*, agents(*)')
                .order('created_at', { ascending: false })
                .limit(20)

            if (!error && data) {
                setMissions(data as MissionWithAgent[])
            }
            setLoading(false)
        }

        fetchMissions()

        const channel = supabase
            .channel('missions_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'missions' },
                () => fetchMissions()
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
                <p className="text-sm font-bold animate-pulse">Cargando misiones...</p>
            </div>
        )
    }

    if (missions.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay misiones registradas</p>
            </div>
        )
    }

    return (
        <div className="bg-white/40 dark:bg-slate-900/40 divide-y divide-slate-200 dark:divide-slate-800 rounded-[2.5rem] overflow-hidden">
            {missions.map((mission) => (
                <MissionRow key={mission.id} mission={mission} />
            ))}
        </div>
    )
}

function MissionRow({ mission }: { mission: MissionWithAgent }) {
    const statusConfig = {
        approved: { color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: CheckCircle2, label: 'Aprobada' },
        running: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: PlayCircle, label: 'En Curso' },
        succeeded: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2, label: 'Exitosa' },
        failed: { color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle, label: 'Fallida' },
        cancelled: { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: AlertCircle, label: 'Cancelada' },
    }

    const config = statusConfig[mission.status as keyof typeof statusConfig] || statusConfig.approved
    const StatusIcon = config.icon

    return (
        <div className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
                        <StatusIcon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight">
                            {mission.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                <User className="w-3 h-3" />
                                {mission.agents?.display_name || mission.agents?.name || 'Sistema'}
                            </div>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(mission.created_at), { addSuffix: true, locale: es })}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.color} border border-current/10`}>
                        {config.label}
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-slate-400 tracking-tighter">
                        PRIORITY {mission.priority}
                    </p>
                </div>
            </div>
            {mission.description && (
                <p className="mt-4 ml-16 text-sm text-slate-600 dark:text-slate-400 font-medium line-clamp-1">
                    {mission.description}
                </p>
            )}
        </div>
    )
}
