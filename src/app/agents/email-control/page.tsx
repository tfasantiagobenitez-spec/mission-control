'use client'

import { useState, useEffect } from 'react'
import { Mail, Shield, Zap, Send, Search, ArrowLeft, Bot, Sparkles, Clock, User, Paperclip } from 'lucide-react'
import Link from 'next/link'
import './EmailControl.css'

export default function EmailControlPage() {
    const [emails, setEmails] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedEmail, setSelectedEmail] = useState<any>(null)
    const [replyText, setReplyText] = useState('')
    const [sending, setSending] = useState(false)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        fetchEmails()
    }, [])

    async function fetchEmails() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/agents/email')
            const data = await res.json()
            if (data.emails) {
                setEmails(data.emails)
                if (data.emails.length > 0) setSelectedEmail(data.emails[0])
            } else if (data.error) {
                setError(data.error)
            }
        } catch (err) {
            console.error('Error:', err)
            setError('Error al cargar correos')
        } finally {
            setLoading(false)
        }
    }

    async function handleSendReply() {
        if (!selectedEmail || !replyText) return
        setSending(true)
        try {
            const isGmail = selectedEmail.isGmail;
            const res = await fetch('/api/agents/email/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: isGmail ? `msg:${selectedEmail.id}` : selectedEmail.id,
                    replyContent: replyText
                })
            })
            if (res.ok) {
                const data = await res.json()
                alert(data.provider === 'gmail' ? 'Respuesta enviada por Gmail' : 'Respuesta enviada a ClickUp')
                setReplyText('')
            }
        } catch (err) {
            alert('Error al enviar respuesta')
        } finally {
            setSending(false)
        }
    }

    const filteredEmails = emails.filter(e => filter === 'all' || e.category === fMap(e.category, filter))

    function fMap(category: string, filter: string) {
        // Simple mapping if needed, but categories already match in our mock
        return filter;
    }

    return (
        <div className="agent-page-container">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div style={{ marginRight: '2rem' }}>
                    <Link href="/agents" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4 group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Volver a la Flota
                    </Link>
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Mail className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
                                <span>Email Control</span>
                                <span className="text-blue-500 text-base font-bold px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">AGENT</span>
                            </h1>
                            <p className="text-slate-400 font-medium tracking-tight">Intelligence Layer for ClickUp Communications</p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white/5 p-4 rounded-2xl border border-white/10"
                    style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}
                >
                    {!loading && emails.length > 0 && emails.some(e => e.isGmail) && (
                        <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                                {emails.find(e => e.isGmail)?.account}
                            </span>
                        </div>
                    )}
                    {!loading && !emails.some(e => e.isGmail) && (
                        <Link
                            href="/api/auth/google?agent=email"
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            <Bot size={14} />
                            Conectar Google
                        </Link>
                    )}
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}
                    >
                        {['all', 'IA', 'Clientes', 'Facturas', 'Importante'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${filter === f ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30' : 'text-slate-500 border-white/5 hover:text-white hover:bg-white/5'}`}
                                style={{ minWidth: '90px' }}
                            >
                                {f === 'all' ? 'Inbox' : f}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-8 p-6 glass-panel border-red-500/30 bg-red-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mt-1">
                            <Shield className="text-red-500 fill-red-500/20" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-500 text-lg font-bold mb-1">Acción Requerida</h3>
                            <p className="text-slate-300 text-base leading-relaxed max-w-2xl">
                                {error.includes('http') ? (
                                    <>
                                        La API de Gmail no está activada en tu proyecto de Google Cloud. El agente no puede leer tus correos hasta que la habilites.
                                        <a href={error.split('aquí: ')[1]} target="_blank" rel="noreferrer" className="block mt-4 text-blue-400 font-black underline hover:text-blue-300 hover:no-underline transition-all">
                                            → ACTIVAR API DE GMAIL AQUÍ
                                        </a>
                                        <span className="block mt-2 text-slate-500 text-xs italic">Una vez activada, recarga esta página.</span>
                                    </>
                                ) : error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
                {/* List View */}
                <div className="col-span-4 glass-panel flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-white/5">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar por remitente o asunto..."
                                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
                            </div>
                        ) : filteredEmails.length > 0 ? (
                            filteredEmails.map(email => (
                                <div
                                    key={email.id}
                                    onClick={() => setSelectedEmail(email)}
                                    className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`badge-modern ${email.category === 'IA' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                                            email.category === 'Clientes' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                                email.category === 'Facturas' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                                                    'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                            }`}>
                                            {email.category}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {email.hasAttachments && (
                                                <Paperclip size={12} className="text-blue-400" />
                                            )}
                                            <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold">
                                                <Clock size={10} />
                                                {email.date}
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
                                        {email.title || email.subject}
                                    </h3>
                                    <p className="text-[10px] text-slate-400/80 line-clamp-2 mt-1 leading-relaxed">
                                        {email.summary}
                                    </p>
                                    <div className="flex justify-between items-center mt-3">
                                        <p className="text-[11px] text-slate-500 font-medium italic">{email.sender}</p>
                                        <span className="text-[9px] text-slate-600 font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {email.account}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center gap-6 p-10 text-center">
                                <div className="opacity-30 flex flex-col items-center gap-3">
                                    <Mail size={40} />
                                    <p className="text-xs font-black uppercase tracking-widest">Bandeja Vacía</p>
                                </div>
                                <div className="mt-4 p-6 glass-panel border-blue-500/20 bg-blue-500/5">
                                    <h4 className="text-sm font-bold mb-2">¿Quieres ver tus correos reales?</h4>
                                    <p className="text-[10px] text-slate-400 mb-4">Conecta tu cuenta de Google para que el Agente pueda analizar tus mensajes de Gmail.</p>
                                    <Link
                                        href="/api/auth/google?agent=email"
                                        className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Conectar Google
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
                    {selectedEmail ? (
                        <>
                            <div className="glass-panel p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                            <User size={24} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight leading-tight mb-1">{selectedEmail.title || selectedEmail.subject}</h2>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-slate-400">{selectedEmail.sender}</span>
                                                {selectedEmail.hasAttachments && (
                                                    <>
                                                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                        <div className="flex items-center gap-1 text-orange-400 text-xs font-bold bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/10">
                                                            <Paperclip size={12} />
                                                            TIENE ADJUNTO (FACTURA/Gasto)
                                                        </div>
                                                    </>
                                                )}
                                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                <span className="text-xs text-blue-400/80 font-bold uppercase tracking-tighter bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10">
                                                    {selectedEmail.account}
                                                </span>
                                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                <span className="text-xs text-slate-600 font-bold uppercase tracking-tighter">Via ClickUp</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-2xl flex flex-col items-end">
                                        <span className="text-[14px] font-black uppercase text-green-500 tracking-widest">IA ANALYZED</span>
                                        <span className="text-[10px] text-green-400/60 font-medium">Ready for Response</span>
                                    </div>
                                </div>

                                <div className="bg-blue-500/5 border-l-4 border-blue-500/30 p-6 rounded-r-2xl mb-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Bot size={14} className="text-blue-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/80">IA Summary</span>
                                    </div>
                                    <p className="text-blue-100/90 italic text-lg font-medium">
                                        "{selectedEmail.summary}"
                                    </p>
                                </div>

                                <div className="text-slate-300 leading-relaxed text-pretty text-lg font-medium py-4">
                                    {selectedEmail.content}
                                </div>

                                <div className="intel-panel glass-panel p-8 mt-auto">
                                    <div className="relative z-10">

                                        <div className="ai-recommendation-box">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Zap size={14} className="text-yellow-500" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500/80">Proposed Reply:</span>
                                            </div>
                                            <div className="text-slate-300">
                                                {selectedEmail.recommendation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-5">
                                <div className="flex gap-4">
                                    <div className="flex-1 relative group">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Escribe tu respuesta aquí o pulsa el rayo para usar la sugerencia..."
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 pr-14 text-sm focus:outline-none focus:border-blue-500/50 h-28 resize-none transition-all placeholder:text-slate-600 font-medium"
                                        />
                                        <button
                                            onClick={() => {
                                                const sugg = selectedEmail.recommendation.match(/"([^"]+)"/)?.[1] || selectedEmail.recommendation;
                                                setReplyText(sugg);
                                            }}
                                            className="absolute right-4 top-4 p-2.5 bg-yellow-500/10 rounded-xl hover:bg-yellow-500/20 transition-all border border-yellow-500/20 group/zap"
                                            title="Usar sugerencia del agente"
                                        >
                                            <Zap className="w-5 h-5 text-yellow-500 group-hover/zap:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSendReply}
                                        disabled={sending || !replyText}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-all rounded-2xl px-10 flex flex-col items-center justify-center gap-2 group shadow-lg shadow-blue-500/20"
                                    >
                                        <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Enviar</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center glass-panel border-dashed border-white/10 opacity-30">
                            <Bot className="w-20 h-20 mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Selecciona un stream para analizar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
