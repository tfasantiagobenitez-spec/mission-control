// [COPY-PASTE-SAFE]
// Archivo: src/app/activity/page.tsx

import { ActivityLog } from '@/components/ActivityLog'
import { Activity, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ActivityPage() {
    return (
        <div className="space-y-12 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-purple-500" />
                        <span className="text-sm font-bold tracking-widest uppercase text-purple-600 dark:text-purple-400">
                            Real-time Awareness
                        </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                        Log de Actividad
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl text-pretty">
                        Eventos, alertas y señales de vida emitidas por cada neurona de la <span className="text-indigo-600 dark:text-indigo-400 font-bold italic">Flota Arecco IA</span>.
                    </p>
                </div>
            </header>

            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Eventos del Sistema</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Flujo cronológico de incidentes y notificaciones</p>
                    </div>
                </div>
                <div className="glass-panel p-1 rounded-[2.5rem]">
                    <ActivityLog />
                </div>
            </section>
        </div>
    )
}
