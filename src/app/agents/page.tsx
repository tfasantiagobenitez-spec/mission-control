// [COPY-PASTE-SAFE]
// Archivo: src/app/agents/page.tsx

import { AgentsList } from '@/components/AgentsList'
import { Shield, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AgentsPage() {
    return (
        <div className="space-y-12 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400">
                            Fleet Management
                        </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                        Nuestros Agentes
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl text-pretty">
                        Administra y monitorea el estado de cada unidad de la <span className="text-indigo-600 dark:text-indigo-400 font-bold italic">Flota Arecco IA</span>.
                    </p>
                </div>
            </header>

            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Personal de Operación</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Listado detallado de agentes y sus capacidades</p>
                    </div>
                </div>
                <div className="glass-panel p-1 rounded-[2.5rem]">
                    <AgentsList />
                </div>
            </section>
        </div>
    )
}
