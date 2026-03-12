import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        const { data, error } = await supabase
            .from('google_tokens')
            .select('email')

        if (error) throw error

        return NextResponse.json({
            success: true,
            accounts: data.map(row => row.email)
        })
    } catch (error: any) {
        console.error('Error fetching connected Google accounts:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
