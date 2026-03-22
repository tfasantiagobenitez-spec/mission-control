import { createClient } from '@supabase/supabase-js'

const CRM_URL = 'https://qgxxgatlaffksezsvvwy.supabase.co'
const CRM_SERVICE_KEY = (process.env.CRM_SUPABASE_SERVICE_ROLE_KEY || '').trim()
const CRM_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneHhnYXRsYWZma3NlenN2dnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNzU5MjMsImV4cCI6MjA1Nzc1MTkyM30.28d1agfRuQtBh178i00ihKXk2f-l59vC6meLunqqiTM'

// Server-side client — uses service role key to bypass RLS
// If no service role key, falls back to anon (limited by RLS)
export function getCRMClient() {
    const key = CRM_SERVICE_KEY || CRM_ANON_KEY
    return createClient(CRM_URL, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
}

export const CRM_CONFIGURED = Boolean(CRM_SERVICE_KEY)
