// [COPY-PASTE-SAFE]
// Archivo: src/app/missions/page.tsx

import { MissionsList } from '@/components/MissionsList'
import { Rocket, History } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function MissionsPage() {
    return (
        <div className="space-y-12 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Rocket className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
                            Operations History
                        </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                        Registro de Misiones
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl text-pretty">
                        Seguimiento detallado de todas las ejecuciones, éxitos y fallos en la <span className="text-indigo-600 dark:text-indigo-400 font-bold italic">Flota Arecco IA</span>.
                    </p>
                </div>
            </header>

            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Historial Operativo</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Listado de misiones recientes y su estado final</p>
                    </div>
                </div>
                <div className="glass-panel p-1 rounded-[2.5rem]">
                    <MissionsList />
                </div>
            </section>
        </div>
    )
}
