import { createClient } from '@supabase/supabase-js'

const CRM_URL = 'https://qgxxgatlaffksezsvvwy.supabase.co'
const CRM_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneHhnYXRsYWZma3NlenN2dnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNzU5MjMsImV4cCI6MjA1Nzc1MTkyM30.28d1agfRuQtBh178i00ihKXk2f-l59vC6meLunqqiTM'

// RLS policies on CRM tables allow public reads (mc_read_* policies)
export function getCRMClient() {
    return createClient(CRM_URL, CRM_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
}

export const CRM_CONFIGURED = true
