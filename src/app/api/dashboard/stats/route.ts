import { NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const crm = getCRMClient()
    const mc = createServerClient()

    const [
        clientsRes, leadsRes, dealsRes, projectsRes,
        activitiesRes, messagesRes,
    ] = await Promise.all([
        crm.from('clients').select('id, status, created_at'),
        crm.from('leads').select('id, status, created_at, first_name, last_name, company'),
        crm.from('deals').select('id, value, currency, title, updated_at, deal_stages(name)'),
        crm.from('projects').select('id, name, status, updated_at'),
        crm.from('activities').select('id, created_at').order('created_at', { ascending: false }).limit(1),
        mc.from('conversation_messages').select('id', { count: 'exact', head: true }),
    ])

    const clients = clientsRes.data || []
    const leads = leadsRes.data || []
    const deals = dealsRes.data || []
    const projects = projectsRes.data || []

    // Pipeline total
    const pipeline = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)

    // Active leads (not converted or unqualified)
    const activeLeads = leads.filter(l => !['converted', 'unqualified'].includes(l.status))

    // Leads sin contactar hace +3 días
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const staleLeads = activeLeads.filter(l => l.created_at < threeDaysAgo)

    // Deals sin actualizar hace +7 días
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const staleDeals = deals.filter(d => d.updated_at < sevenDaysAgo)

    // Proyectos activos sin actividad reciente
    const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'pending')
    const staleProjects = activeProjects.filter(p => p.updated_at < sevenDaysAgo)

    return NextResponse.json({
        kpis: {
            pipeline,
            activeClients: clients.filter(c => c.status === 'active').length,
            activeLeads: activeLeads.length,
            activeProjects: activeProjects.length,
            totalMessages: messagesRes.count ?? 0,
        },
        alerts: {
            staleLeads: staleLeads.slice(0, 5).map(l => ({
                name: `${l.first_name} ${l.last_name ?? ''}`.trim(),
                company: l.company,
                daysSince: Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000),
            })),
            staleDeals: staleDeals.slice(0, 5).map(d => ({
                title: d.title,
                value: d.value,
                daysSince: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000),
            })),
            staleProjects: staleProjects.slice(0, 3).map(p => ({
                name: p.name,
                daysSince: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000),
            })),
        },
    })
}
