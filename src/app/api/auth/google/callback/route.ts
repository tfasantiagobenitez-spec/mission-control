import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
        console.error('Missing Google or Supabase config:', {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseKey: !!supabaseKey
        })
        return new Response('<h1>Error: faltan variables de entorno de Google o Supabase</h1>', {
            status: 500, headers: { 'Content-Type': 'text/html' }
        })
    }

    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
        return new Response(`<h1>Error de autenticación: ${error}</h1>`, {
            status: 400, headers: { 'Content-Type': 'text/html' }
        })
    }

    if (!code) {
        return new Response('<h1>Error: no se recibió código de autorización</h1>', {
            status: 400, headers: { 'Content-Type': 'text/html' }
        })
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3005'}/api/auth/google/callback`

    // Exchange code for tokens
    const debugInfo = {
        timestamp: new Date().toISOString(),
        clientId,
        clientSecret: clientSecret.substring(0, 5) + '...',
        redirectUri,
        code: code.substring(0, 10) + '...'
    };

    const logPath = 'C:\\Users\\benit\\.gemini\\antigravity\\mission-control-oauth.log';
    try {
        fs.appendFileSync(logPath, JSON.stringify(debugInfo, null, 2) + '\n---\n');
    } catch (e) {
        console.error('Failed to write log file:', e);
    }

    console.log('Sending token request with:', debugInfo)

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
        code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams,
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
        console.error('Google Token Exchange Failed:', tokens);
        const logPath = 'C:\\Users\\benit\\.gemini\\antigravity\\mission-control-oauth-error.log';
        try {
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] FAIL: ${JSON.stringify(tokens)}\nParams: ${tokenParams.toString().replace(clientSecret.trim(), 'REDACTED')}\n---\n`);
        } catch (e) { }

        return new Response(`<h1>Error obteniendo tokens: ${JSON.stringify(tokens)}</h1>`, {
            status: 500, headers: { 'Content-Type': 'text/html' }
        })
    }

    // Get user email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userRes.json()
    const email = userInfo.email

    if (!email) {
        return new Response('<h1>Error: no se pudo obtener el email de Google</h1>', {
            status: 500, headers: { 'Content-Type': 'text/html' }
        })
    }

    // Save/update tokens in Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)
    const expiresAt = Date.now() + (tokens.expires_in * 1000)

    const { error: dbError } = await supabase
        .from('google_tokens')
        .upsert({
            email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'email' })

    if (dbError) {
        return new Response(`<h1>Error guardando tokens: ${dbError.message}</h1>`, {
            status: 500, headers: { 'Content-Type': 'text/html' }
        })
    }

    // Redirect back to the originating agent
    const agent = request.nextUrl.searchParams.get('state') || 'calendar'
    const agentPath = agent === 'email' ? 'email-control' : 'calendar-control'

    return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3005'}/agents/${agentPath}?connected=${encodeURIComponent(email)}`
    )
}
