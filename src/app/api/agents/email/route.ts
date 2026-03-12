import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/openrouter'
import { createClient } from '@supabase/supabase-js'
import { listGmailMessages, getGmailMessage, refreshGoogleToken } from '@/lib/gmail'
import fs from 'fs'
import path from 'path'

const logPath = 'C:\\Users\\benit\\.gemini\\antigravity\\email-agent.log'

function log(msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`
    console.log(entry.trim())
    try {
        fs.appendFileSync(logPath, entry)
    } catch (e) { }
}

export async function GET() {
    const targetEmail = 'sbenitez@areccoia.com'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        log(`Fetching for ${targetEmail}...`)

        // 1. Try to get Google tokens - CASE INSENSITIVE
        let { data: tokenData, error: dbError } = await supabase
            .from('google_tokens')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle()

        if (!tokenData && !dbError) {
            log(`Checking for ANY available tokens...`)
            const { data: allTokens } = await supabase.from('google_tokens').select('*').limit(1)
            if (allTokens && allTokens.length > 0) {
                tokenData = allTokens[0]
                log(`Found token for different email: ${tokenData.email}`)
            }
        }

        log(`Token found: ${!!tokenData}, Email: ${tokenData?.email || 'none'}, Error: ${dbError?.message || 'none'}`)

        let emails: any[] = []

        if (!dbError && tokenData) {
            log(`Processing Gmail account: ${tokenData.email}`)
            let accessToken = tokenData.access_token

            // Check if expired (with 1 min buffer)
            if (tokenData.expires_at < Date.now() + 60000 && tokenData.refresh_token) {
                console.log('Refreshing Gmail token...')
                const newTokens = await refreshGoogleToken(tokenData.refresh_token)
                accessToken = newTokens.access_token

                // Update DB
                await supabase.from('google_tokens').update({
                    access_token: accessToken,
                    expires_at: Date.now() + (newTokens.expires_in * 1000),
                    updated_at: new Date().toISOString()
                }).eq('email', targetEmail)
            }

            // Fetch real emails from Gmail (Increased limit to 50 for deep search)
            const msgList = await listGmailMessages(accessToken, 50)
            log(`Found ${msgList.length} messages in Gmail`)

            const fullMessages = await Promise.all(
                msgList.map((m: any) => getGmailMessage(accessToken, m.id).catch(e => {
                    log(`Error fetching msg ${m.id}: ${e.message}`)
                    return null
                }))
            )

            const validMessages = fullMessages.filter(m => m !== null)
            log(`Successfully fetched details for ${validMessages.length} messages`)

            // Debug logging for subjects
            validMessages.forEach(m => log(`DEBUG: Found subject: "${m.subject}" from ${m.from}`));

            emails = validMessages.map(msg => ({
                id: msg.id,
                threadId: msg.threadId,
                subject: msg.subject,
                sender: msg.from,
                content: msg.body,
                date: msg.date,
                account: targetEmail,
                isGmail: true,
                hasAttachments: msg.hasAttachments
            }))
        } else {
            // FALLBACK TO CLICKUP if no Gmail tokens
            const token = process.env.CLICKUP_API_TOKEN
            const listId = process.env.CLICKUP_LIST_ID

            if (token && listId) {
                const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?subtasks=true`, {
                    headers: { Authorization: token }
                })
                if (response.ok) {
                    const data = await response.json()
                    emails = data.tasks.map((task: any) => ({
                        id: task.id,
                        title: task.name,
                        sender: task.creator?.username || 'ClickUp',
                        content: task.description || 'Sin contenido...',
                        date: task.date_created ? new Date(parseInt(task.date_created)).toLocaleString() : 'Reciente',
                        account: 'ClickUp System',
                        isGmail: false
                    }))
                }
            }
        }

        // 2. Process all emails with OpenRouter for intelligence
        const processedEmails = await Promise.all(emails.map(async (email) => {
            const prompt = `Analiza el siguiente correo y devuelve un JSON con:
1. "category": [IA, Clientes, Facturas, Importante, Otros] -> Usa "Facturas" si el correo es de IONOS, menciona facturas, recibos, pagos, gastos, abonos, invoice, comprobante o tiene adjuntos.
2. "summary": Resumen de 1-2 frases.
3. "recommendation": Sugerencia de respuesta profesional entre comillas.

Correo:
Asunto: ${email.title || email.subject}
Remitente: ${email.sender}
Adjuntos: ${email.hasAttachments ? 'SÍ (Tiene archivos adjuntos)' : 'NO'}
Contenido: ${email.content.substring(0, 500)}

Responde SOLO el JSON.`

            let analysis = {
                category: 'Importante',
                summary: 'Analizando...',
                recommendation: 'Reflexionando sobre la respuesta...'
            }

            try {
                const aiResult = await chatCompletion({
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })

                const text = aiResult.choices[0]?.message.content || '{}'
                const jsonMatch = text.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0])
                    analysis = {
                        category: parsed.category || 'Otros',
                        summary: parsed.summary || 'Sin resumen',
                        recommendation: parsed.recommendation || 'Consultar al operador.'
                    }
                    log(`AI Categorized msg ${email.id} [${email.title || email.subject}]: ${analysis.category}`)
                }
            } catch (err) {
                console.error('AI Processing error:', err)
            }

            return { ...email, ...analysis }
        }))

        return NextResponse.json({ success: true, emails: processedEmails })
    } catch (error: any) {
        log(`Email Agent System Error: ${error.message}`)

        if (error.message.includes('gmail.googleapis.com')) {
            return NextResponse.json({
                success: false,
                error: "La API de Gmail no está activada en tu consola de Google. Por favor, actívala aquí: https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=994677285864",
                needsAction: true
            }, { status: 403 })
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
