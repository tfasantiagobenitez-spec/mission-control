// [COPY-PASTE-SAFE]
// Archivo: src/app/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { AgentsList } from '@/components/AgentsList'
import { ProposalsPanel } from '@/components/ProposalsPanel'
import { Activity, Shield, Rocket, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let agentsCount = 0;
  let missionsCount = 0;
  let proposalsCount = 0;

  try {
    const supabase = createServerClient()

    const [
      { count: aCount },
      { count: mCount },
      { count: pCount }
    ] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true }),
      supabase.from('proposals').select('*', { count: 'exact', head: true })
    ])

    agentsCount = aCount || 0;
    missionsCount = mCount || 0;
    proposalsCount = pCount || 0;
  } catch (error) {
    console.error("Error fetching stats:", error);
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse-soft" />
            <span className="text-sm font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
              Fleet Overview
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
            Mission Control
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xl text-pretty">
            Orquestación en tiempo real de la <span className="text-indigo-600 dark:text-indigo-400 font-bold italic">Flota Arecco IA</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-bold shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Sistema Operativo Activo
        </div>
      </header>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard
          title="Agentes en Servicio"
          value={agentsCount}
          icon={<Shield className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Misiones Completadas"
          value={missionsCount}
          icon={<Rocket className="w-6 h-6" />}
          color="indigo"
        />
        <StatCard
          title="Propuestas en Espera"
          value={proposalsCount}
          icon={<Activity className="w-6 h-6" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Columna Principal: Propuestas */}
        <section className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">Decisiones Críticas</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Propuestas pendientes de validación humana</p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-1 rounded-[2.5rem]">
            <ProposalsPanel />
          </div>
        </section>

        {/* Columna Lateral: Estado de Agentes */}
        <section className="lg:col-span-4 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">Estado Flota</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Estatus operativo de la armada</p>
            </div>
          </div>
          <div className="glass-panel p-1 rounded-[2.5rem]">
            <AgentsList />
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: 'blue' | 'indigo' | 'amber' }) {
  const colors = {
    blue: 'from-blue-600 to-blue-400 text-blue-600 shadow-blue-500/10',
    indigo: 'from-indigo-600 to-indigo-400 text-indigo-600 shadow-indigo-500/10',
    amber: 'from-amber-600 to-amber-400 text-amber-600 shadow-amber-500/10'
  }

  return (
    <div className={`glass-card p-8 group overflow-hidden relative`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${colors[color]} opacity-5 blur-2xl group-hover:opacity-15 transition-opacity duration-500`} />

      <div className="flex items-center justify-between relative z-10">
        <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center ${colors[color]} shadow-2xl group-hover:scale-110 transition-transform duration-500 ease-out`}>
          {icon}
        </div>
        <div className="text-right">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            {title}
          </h3>
          <p className="text-5xl font-black mt-1 tracking-tighter text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-right">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}
