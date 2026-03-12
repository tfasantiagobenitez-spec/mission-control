'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function CRMPage() {
    const [contacts, setContacts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
        fetchContacts()
    }, [])

    const fetchContacts = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('crm_contacts')
            .select('*')
            .order('relationship_score', { ascending: false })

        setContacts(data || [])
        setLoading(false)
    }

    const triggerSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch('/api/crm/sync?token=' + process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN)
            if (res.ok) {
                alert('Sincronización iniciada en segundo plano.')
            }
        } catch (e) {
            console.error(e)
        }
        setSyncing(false)
        // Refresh after a delay
        setTimeout(fetchContacts, 5000)
    }

    return (
        <div className="p-8 max-w-6xl mx-auto dark:text-white">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Personal CRM
                </h1>
                <button
                    onClick={triggerSync}
                    disabled={syncing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                >
                    {syncing ? 'Sincronizando...' : 'Sincronizar Gmail/Calendar'}
                </button>
            </div>

            {loading ? (
                <p>Cargando contactos...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contacts.map(c => (
                        <div key={c.id} className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-blue-500 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-semibold">{c.full_name}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${c.relationship_score > 70 ? 'bg-green-900 text-green-300' :
                                        c.relationship_score > 30 ? 'bg-yellow-900 text-yellow-300' :
                                            'bg-red-900 text-red-300'
                                    }`}>
                                    Salud: {c.relationship_score}%
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-1">{c.company || 'Empresa desconocida'}</p>
                            <p className="text-gray-500 text-xs mb-4">{c.email}</p>

                            <div className="text-xs text-gray-500">
                                Último contacto: {c.last_interaction_at ? new Date(c.last_interaction_at).toLocaleDateString() : 'Nunca'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
