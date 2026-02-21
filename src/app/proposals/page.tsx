// [COPY-PASTE-SAFE]
// Archivo: src/app/proposals/page.tsx

import { ProposalsPanel } from '@/components/ProposalsPanel'
import { Activity, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ProposalsPage() {
    return (
        <div className="space-y-12 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400">
                            Human-in-the-Loop
                        </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                        Buzón de Propuestas
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl text-pretty">
                        Valida las acciones autónomas antes de que se conviertan en misiones reales de la flota.
                    </p>
                </div>
            </header>

            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Decisiones Críticas</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Revisión de propuestas pendientes por los agentes</p>
                    </div>
                </div>
                <div className="glass-panel p-1 rounded-[2.5rem]">
                    <ProposalsPanel />
                </div>
            </section>
        </div>
    )
}
