'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Target,
    CheckSquare,
    BarChart2,
    Brain,
    Link as LinkIcon,
    Settings,
    Activity,
    Users,
    Sparkles,
    Briefcase,
    Building2,
    UserCheck,
    TrendingUp,
    FolderOpen,
    ChevronDown,
    ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

export function Sidebar() {
    const pathname = usePathname()
    const [crmOpen, setCrmOpen] = useState(pathname.startsWith('/business-crm'))

    const isActive = (href: string) =>
        pathname === href || (href !== '/' && pathname.startsWith(href) && (pathname.length === href.length || pathname[href.length] === '/'))

    const mainLinks = [
        { href: '/', label: 'Command Center', icon: LayoutDashboard },
        { href: '/agents', label: 'Agents', icon: Brain },
        { href: '/agents/advisory-council', label: 'AI Advisory Council', icon: Sparkles },
        { href: '/productivity', label: 'Productivity', icon: Target },
        { href: '/tasks', label: 'Tasks', icon: CheckSquare },
        { href: '/content-intel', label: 'Content Intel', icon: BarChart2 },
        { href: '/memory', label: 'Brain', icon: Brain },
        { href: '/crm', label: 'Personal CRM', icon: Users },
        { href: '/connections', label: 'Connections', icon: LinkIcon },
        { href: '/settings', label: 'Settings', icon: Settings },
    ]

    const crmLinks = [
        { href: '/business-crm', label: 'Overview', icon: Briefcase },
        { href: '/business-crm/clientes', label: 'Clientes', icon: Building2 },
        { href: '/business-crm/contactos', label: 'Contactos', icon: UserCheck },
        { href: '/business-crm/pipeline', label: 'Pipeline', icon: TrendingUp },
        { href: '/business-crm/leads', label: 'Leads', icon: Target },
        { href: '/business-crm/proyectos', label: 'Proyectos', icon: FolderOpen },
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-container">
                    <Activity className="logo-icon" />
                </div>
                <div className="logo-text">
                    <h1>Mission Control</h1>
                    <span className="version">v0.1.0</span>
                </div>
            </div>

            <div className="agent-status-card">
                <div className="status-indicator">
                    <div className="status-dot"></div>
                </div>
                <div className="status-info">
                    <span className="status-title">Agent Online</span>
                    <span className="status-model">Claude Sonnet 4</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {mainLinks.map((link) => {
                        const Icon = link.icon
                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
                                >
                                    <Icon className="nav-icon" size={20} />
                                    <span>{link.label}</span>
                                </Link>
                            </li>
                        )
                    })}

                    {/* Business CRM collapsible */}
                    <li>
                        <button
                            onClick={() => setCrmOpen(o => !o)}
                            className={`nav-link w-full text-left ${pathname.startsWith('/business-crm') ? 'active' : ''}`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <Briefcase className="nav-icon" size={20} />
                            <span style={{ flex: 1 }}>Business CRM</span>
                            {crmOpen
                                ? <ChevronDown size={14} style={{ opacity: 0.5 }} />
                                : <ChevronRight size={14} style={{ opacity: 0.5 }} />
                            }
                        </button>

                        {crmOpen && (
                            <ul style={{ paddingLeft: '1.5rem', marginTop: '2px' }}>
                                {crmLinks.map(link => {
                                    const Icon = link.icon
                                    return (
                                        <li key={link.href}>
                                            <Link
                                                href={link.href}
                                                className={`nav-link nav-link-sub ${isActive(link.href) ? 'active' : ''}`}
                                            >
                                                <Icon className="nav-icon" size={16} />
                                                <span>{link.label}</span>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </li>
                </ul>
            </nav>

            <div className="sidebar-footer">
                <div className="xp-container">
                    <div className="xp-header">
                        <span className="xp-level">Level 7 — Field Agent</span>
                        <span className="xp-value">720 / 1000 XP</span>
                    </div>
                    <div className="xp-bar-bg">
                        <div className="xp-bar-fill" style={{ width: '72%' }}></div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
