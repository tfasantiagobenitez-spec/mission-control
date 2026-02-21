// [COPY-PASTE-SAFE]
// Archivo: src/lib/supabase/server.ts

import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

export function createServerClient() {
    return createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey || config.supabase.anonKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
