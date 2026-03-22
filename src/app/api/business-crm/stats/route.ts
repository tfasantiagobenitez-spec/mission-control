import { NextResponse } from 'next/server'
import { getCRMClient } from '@/lib/crm/business-client'

export async function GET() {
    const db = getCRMClient()

    const [clients, leads, deals, projects, activities] = await Promise.all([
        db.from('clients').select('id, status', { count: 'exact' }),
        db.from('leads').select('id, status', { count: 'exact' }),
        db.from('deals').select('id, value, currency', { count: 'exact' }),
        db.from('projects').select('id, status', { count: 'exact' }),
        db.from('activities').select('id', { count: 'exact' }),
    ])

    const totalPipeline = (deals.data || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0)
    const wonDeals = (deals.data || []).filter(d => d.value > 0).length
    const activeClients = (clients.data || []).filter(c => c.status === 'active').length
    const newLeads = (leads.data || []).filter(l => l.status === 'new' || l.status === 'contacted').length
    const activeProjects = (projects.data || []).filter(p => p.status === 'active').length

    return NextResponse.json({
        clients: { total: clients.count ?? 0, active: activeClients },
        leads: { total: leads.count ?? 0, new: newLeads },
        deals: { total: deals.count ?? 0, pipeline: totalPipeline },
        projects: { total: projects.count ?? 0, active: activeProjects },
        activities: activities.count ?? 0,
    })
}
