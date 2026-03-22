import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_URL = 'https://qgxxgatlaffksezsvvwy.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneHhnYXRsYWZma3NlenN2dnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNzU5MjMsImV4cCI6MjA1Nzc1MTkyM30.28d1agfRuQtBh178i00ihKXk2f-l59vC6meLunqqiTM'

export async function GET() {
    const rawKey = process.env.CRM_SUPABASE_SERVICE_ROLE_KEY ?? ''
    const keyLength = rawKey.trim().length
    const keyConfigured = keyLength > 50

    // Try with whatever key we have
    const key = keyConfigured ? rawKey.trim() : ANON_KEY
    const db = createClient(CRM_URL, key, { auth: { persistSession: false } })

    const { data, error, count } = await db
        .from('contacts')
        .select('id, first_name', { count: 'exact' })
        .limit(3)

    return NextResponse.json({
        service_key_length: keyLength,
        service_key_configured: keyConfigured,
        using_key: keyConfigured ? 'service_role' : 'anon',
        contacts_count: count,
        contacts_sample: data,
        error: error?.message ?? null,
    })
}
