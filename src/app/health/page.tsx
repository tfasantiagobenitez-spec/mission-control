// [COPY-PASTE-SAFE]
// Archivo: src/app/health/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeightLog } from '@/lib/types'
import { Scale, Calendar, TrendingDown, TrendingUp, Minus, ChevronLeft, Plus, History, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts'

export default function HealthPage() {
    const [logs, setLogs] = useState<WeightLog[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchLogs() {
            const { data, error } = await supabase
                .from('weight_logs')
                .select('*')
                .order('logged_at', { ascending: true })

            if (!error && data) {
                setLogs(data as WeightLog[])
            }
            setLoading(false)
        }

        fetchLogs()

        const channel = supabase
            .channel('health_page_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'weight_logs' },
                () => fetchLogs()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const chartData = logs.map(log => ({
        date: format(new Date(log.logged_at), 'dd MMM', { locale: es }),
        fullDate: format(new Date(log.logged_at), 'PPP', { locale: es }),
        weight: log.weight,
    }))

    const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : 0
    const firstWeight = logs.length > 0 ? logs[0].weight : 0
    const totalDiff = latestWeight - firstWeight

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
                <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
                <h2 className="text-lg font-black uppercase tracking-widest animate-pulse">Cargando Biométricos...</h2>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4">
                        <ChevronLeft size={14} />
                        Volver a Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                        <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue">
                            <Scale size={32} />
                        </div>
                        Health Tracker
                    </h1>
                    <p className="text-white/40 font-medium">Sincronización biométrica con la Flota Arecco AI</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-6 py-3 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md">
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 text-center">PROGRESO TOTAL</div>
                        <div className={`text-2xl font-black text-center ${totalDiff <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(1)} <span className="text-sm opacity-50">kg</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="premium-card p-6 h-[450px] relative overflow-hidden group">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Evolución de Peso</h3>
                                    <p className="text-[10px] text-white/20 uppercase font-bold mt-1 tracking-widest">Últimos registros sincronizados</p>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(90,156,245,0.5)]" /> Kilogramos (kg)</span>
                                </div>
                            </div>

                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--brand-blue)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--brand-blue)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={['dataMin - 1', 'dataMax + 1']}
                                        />
                                        <Tooltip
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(23, 23, 23, 0.95)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '16px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                                fontSize: '12px'
                                            }}
                                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                            formatter={(value: any) => [`${value} kg`, 'Peso']}
                                            labelStyle={{ color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="weight"
                                            stroke="var(--brand-blue)"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorWeight)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Meta Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="premium-card p-6 border-l-4 border-l-brand-blue relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                <Activity size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">FUENTES DE DATOS</div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/60 font-medium">Open Claw (Telegram)</span>
                                        <span className="px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue text-[9px] font-black tracking-widest">LIVE</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/60 font-medium">Mission Control Manual</span>
                                        <span className="px-2 py-0.5 rounded bg-white/5 text-white/20 text-[9px] font-black tracking-widest">STANDBY</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6 border-l-4 border-l-brand-orange relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                <TrendingUp size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">PRÓXIMA META</div>
                                <div className="text-2xl font-black text-white">Reducir Variabilidad</div>
                                <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider font-bold">Consistencia en ayunas recomendada</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-6">
                    <div className="premium-card flex flex-col h-[612px]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                                <History size={14} />
                                Historial Completo
                            </h3>
                            <div className="p-1.5 bg-white/5 rounded-lg text-white/30 hover:text-white cursor-pointer transition-colors">
                                <Plus size={16} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {logs.slice().reverse().map((log) => (
                                <div key={log.id} className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all border border-white/5 hover:border-white/10 group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xl font-black text-white group-hover:text-brand-blue transition-colors">
                                            {log.weight.toFixed(1)} <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">{log.unit}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                {format(new Date(log.logged_at), 'dd MMM yyyy')}
                                            </span>
                                            <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter">
                                                {format(new Date(log.logged_at), 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-2 border-t border-white/[0.03]">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${log.source === 'telegram' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-white/30'}`}>
                                            {log.source === 'telegram' ? 'TELEGRAM' : 'MANUAL'}
                                        </span>
                                        {log.notes && (
                                            <span className="text-[10px] text-white/40 italic truncate font-medium">
                                                "{log.notes}"
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {logs.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full opacity-10 py-20 text-center">
                                    <Scale size={64} className="mb-4" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Sin historial biométrico</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
