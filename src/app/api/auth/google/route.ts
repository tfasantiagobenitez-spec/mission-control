import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
    if (!clientId) {
        console.error('GOOGLE_CLIENT_ID not found in process.env')
        return NextResponse.json({ error: 'GOOGLE_CLIENT_ID no configurado' }, { status: 500 })
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3005'}/api/auth/google/callback`

    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/drive',
    ].join(' ')

    const agent = request.nextUrl.searchParams.get('agent') || 'calendar'

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent select_account',
        state: agent
    })

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
