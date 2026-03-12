import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * [COPY-PASTE-SAFE]
 * Archivo: src/app/api/weight/route.ts
 * Endpoint para registrar peso desde Open Claw u otras fuentes.
 */

export async function POST(request: Request) {
    const supabase = createServerClient()

    try {
        const body = await request.json()
        const { weight, unit = 'kg', notes = '', source = 'api' } = body

        if (!weight || isNaN(weight)) {
            return NextResponse.json({ error: 'Valid weight is required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('weight_logs')
            .insert([
                {
                    weight: parseFloat(weight),
                    unit,
                    notes,
                    source,
                    logged_at: new Date().toISOString()
                }
            ])
            .select()

        if (error) {
            console.error('Supabase Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET() {
    const supabase = createServerClient()

    try {
        const { data, error } = await supabase
            .from('weight_logs')
            .select('*')
            .order('logged_at', { ascending: false })
            .limit(10)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
