// [COPY-PASTE-SAFE]
// Archivo: src/components/Navigation.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Rocket, FileText, Activity } from 'lucide-react'

export function Navigation() {
    const pathname = usePathname()

    const links = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/agents', label: 'Agentes', icon: Users },
        { href: '/missions', label: 'Misiones', icon: Rocket },
        { href: '/proposals', label: 'Propuestas', icon: FileText },
        { href: '/activity', label: 'Actividad', icon: Activity },
    ]

    return (
        <nav className="sticky top-0 z-50 glass-panel mb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                                <Rocket className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                OpenClaw
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-1">
                            {links.map((link) => {
                                const Icon = link.icon
                                const isActive = pathname === link.href
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.label}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white dark:border-slate-800 shadow-md overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                            {/* Avatar placeholder */}
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                                S
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}
