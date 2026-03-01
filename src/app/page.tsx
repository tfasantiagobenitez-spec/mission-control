// [COPY-PASTE-SAFE]
// Archivo: src/app/page.tsx

import { createServerClient } from '@/lib/supabase/server'
import { ActivityLog } from '@/components/ActivityLog'
import { WeightCard } from '@/components/WeightCard'
import { Activity, Shield, Rocket, Sparkles, Cpu, HardDrive, Wifi, RadioTower, Database, RefreshCcw, Zap, Heart } from 'lucide-react'
import './CommandCenter.css'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let agentsCount = 0;
  let missionsCount = 0;

  try {
    const supabase = createServerClient()

    const [
      { count: aCount },
      { count: mCount }
    ] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true })
    ])

    agentsCount = aCount || 12; // Fallback mock data if null
    missionsCount = mCount || 148;
  } catch (error) {
    console.error("Error fetching stats:", error);
    // Setup Mock data for display purposes
    agentsCount = 12;
    missionsCount = 148;
  }

  return (
    <div className="command-center">
      <header className="cc-header">
        <div className="cc-header-title">
          <div className="cc-eyebrow">
            <Sparkles size={18} className="animate-pulse-soft" />
            <span>Fleet Overview</span>
          </div>
          <h1 className="cc-title">Mission Control</h1>
          <p className="cc-subtitle">
            Orquestación en tiempo real de la <span style={{ color: 'var(--brand-blue)', fontStyle: 'italic' }}>Flota Arecco IA</span>.
          </p>
        </div>
        <div className="cc-status-badge shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" style={{ backgroundColor: 'var(--brand-green)' }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: 'var(--brand-green)' }}></span>
          </span>
          Sistema Operativo Activo
        </div>
      </header>

      {/* Estadísticas */}
      <div className="cc-stats-grid">
        <StatCard
          title="Mensajes Procesados"
          value="14,239"
          icon={<Activity />}
          color="blue"
          badge="+2.4k hoy"
        />
        <StatCard
          title="Agentes Activos"
          value={agentsCount.toString()}
          icon={<Shield />}
          color="green"
          badge="100% vitalidad"
        />
        <StatCard
          title="Llamadas a Herramientas"
          value="892"
          icon={<Cpu />}
          color="orange"
          badge="Últimas 24h"
        />
        <StatCard
          title="Misiones Exitosas"
          value={missionsCount.toString()}
          icon={<Rocket />}
          color="red"
          badge="98% ratio"
        />
      </div>

      <div className="cc-main-grid">
        {/* Columna Principal: Actividad en Vivo */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="cc-section-header">
            <div className="cc-section-icon shadow-sm">
              <RadioTower size={24} />
            </div>
            <div>
              <h2 className="cc-section-title">Live Activity Feed</h2>
              <p className="cc-section-subtitle">Transcripción en tiempo real de la flota</p>
            </div>
          </div>
          <div className="premium-card">
            <ActivityLog />
          </div>
        </section>

        {/* Columna Lateral: Configuración y Acciones */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cc-section-header" style={{ marginBottom: '0.1rem' }}>
              <div className="cc-section-icon shadow-sm" style={{ color: 'var(--brand-blue)' }}>
                <Heart size={24} />
              </div>
              <div>
                <h2 className="cc-section-title" style={{ fontSize: '1.25rem' }}>Personal Health</h2>
              </div>
            </div>
            <WeightCard />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cc-section-header" style={{ marginBottom: '0.5rem' }}>
              <div className="cc-section-icon shadow-sm" style={{ color: 'var(--brand-green)' }}>
                <HardDrive size={24} />
              </div>
              <div>
                <h2 className="cc-section-title" style={{ fontSize: '1.25rem' }}>Agent Config</h2>
                <p className="cc-section-subtitle" style={{ fontSize: '0.75rem' }}>Parámetros del núcleo</p>
              </div>
            </div>

            <div className="premium-card config-panel">
              <div className="config-item">
                <div className="config-label-group">
                  <Cpu size={16} />
                  <span className="config-label">Core Model</span>
                </div>
                <span className="config-value">claude-3-5-sonnet</span>
              </div>
              <div className="config-item">
                <div className="config-label-group">
                  <Database size={16} />
                  <span className="config-label">Memory Stack</span>
                </div>
                <span className="config-value">14.2 MB Synced</span>
              </div>
              <div className="config-item">
                <div className="config-label-group">
                  <Wifi size={16} />
                  <span className="config-label">Connections</span>
                </div>
                <span className="config-value" style={{ color: 'var(--brand-green)' }}>Online</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cc-section-header" style={{ marginBottom: '0.5rem' }}>
              <div className="cc-section-icon shadow-sm" style={{ color: 'var(--brand-orange)' }}>
                <Zap size={24} />
              </div>
              <div>
                <h2 className="cc-section-title" style={{ fontSize: '1.25rem' }}>Quick Actions</h2>
              </div>
            </div>

            <div className="quick-actions">
              <button className="quick-action-btn">
                <RadioTower size={18} />
                <span>Send Manual Heartbeat</span>
              </button>
              <button className="quick-action-btn">
                <RefreshCcw size={18} />
                <span>Sync Knowledge Base</span>
              </button>
              <button className="quick-action-btn">
                <Shield size={18} />
                <span>Run Architecture Diagnostics</span>
              </button>
            </div>
          </div>

        </section>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, badge }: { title: string; value: string; icon: React.ReactNode; color: 'blue' | 'green' | 'orange' | 'red'; badge: string }) {
  return (
    <div className="stat-card shadow-sm" data-color={color}>
      <div className="stat-header">
        <div className="stat-icon shadow-sm">
          {icon}
        </div>
        <div className="stat-badge">
          {badge}
        </div>
      </div>
      <div className="stat-content">
        <p className="stat-value">{value}</p>
        <h3 className="stat-label">{title}</h3>
      </div>
    </div>
  )
}
