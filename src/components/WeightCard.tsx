// [COPY-PASTE-SAFE]
// Archivo: src/components/WeightCard.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeightLog } from '@/lib/types'
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function WeightCard() {
    const [latestLog, setLatestLog] = useState<WeightLog | null>(null)
    const [prevLog, setPrevLog] = useState<WeightLog | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchWeight() {
            const { data, error } = await supabase
                .from('weight_logs')
                .select('*')
                .order('logged_at', { ascending: false })
                .limit(2)

            if (!error && data) {
                setLatestLog(data[0] || null)
                setPrevLog(data[1] || null)
            }
            setLoading(false)
        }

        fetchWeight()

        const channel = supabase
            .channel('weight_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'weight_logs' },
                () => fetchWeight()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-white/50">
                <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mr-3" />
                <span className="text-xs font-bold uppercase tracking-widest">Sincronizando peso...</span>
            </div>
        )
    }

    if (!latestLog) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                <Scale className="text-white/20 mb-3" size={32} />
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Sin registros de peso</p>
                <p className="text-[10px] text-white/20 mt-1 uppercase tracking-wider">Dile a Open Claw tu peso para empezar</p>
            </div>
        )
    }

    const diff = prevLog ? latestLog.weight - prevLog.weight : 0
    const TrendIcon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus
    const trendColor = diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-white/40'

    return (
        <div className="group relative overflow-hidden p-5 bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl border border-white/10 transition-all duration-300">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-brand-blue/20 transition-colors" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                            <Scale size={18} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Estado Físico</h3>
                    </div>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                        {formatDistanceToNow(new Date(latestLog.logged_at), { addSuffix: true, locale: es })}
                    </span>
                </div>

                <div className="flex items-end gap-3 mt-1">
                    <div className="text-4xl font-black tracking-tighter text-white">
                        {latestLog.weight}
                        <span className="text-sm font-bold text-white/30 ml-1 uppercase">{latestLog.unit}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 ${trendColor}`}>
                        <TrendIcon size={12} />
                        <span className="text-[10px] font-black tracking-wider">
                            {diff === 0 ? 'ESTABLE' : `${Math.abs(diff).toFixed(1)} ${latestLog.unit}`}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">vs anterior</span>
                </div>
            </div>
        </div>
    )
}
