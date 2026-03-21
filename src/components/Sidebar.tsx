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
    Sparkles
} from 'lucide-react'
import './Sidebar.css'

export function Sidebar() {
    const pathname = usePathname()

    const links = [
        { href: '/', label: 'Command Center', icon: LayoutDashboard },
        { href: '/agents', label: 'Agents', icon: Brain },
        { href: '/agents/advisory-council', label: 'AI Advisory Council', icon: Sparkles },
        { href: '/productivity', label: 'Productivity', icon: Target },
        { href: '/tasks', label: 'Tasks', icon: CheckSquare },
        { href: '/content-intel', label: 'Content Intel', icon: BarChart2 },
        { href: '/memory', label: 'Second Brain', icon: Brain }, // Brain icon used for Memory too, maybe change one?
        { href: '/crm', label: 'Personal CRM', icon: Users },
        { href: '/connections', label: 'Connections', icon: LinkIcon },
        { href: '/settings', label: 'Settings', icon: Settings },
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
                    {links.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href) && (pathname.length === link.href.length || pathname[link.href.length] === '/'))

                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={`nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <Icon className="nav-icon" size={20} />
                                    <span>{link.label}</span>
                                </Link>
                            </li>
                        )
                    })}
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
