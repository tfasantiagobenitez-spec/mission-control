import { createClient } from '../supabase/client';

const supabase = createClient();

export const supabaseStore = {
    // Arbitrary key-value storage
    saveData: async (key: string, value: any, dataType: 'number' | 'text' | 'json') => {
        const { data, error } = await supabase
            .from('data_store')
            .upsert({
                key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                data_type: dataType,
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
        return data;
    },

    queryData: async (key: string) => {
        const { data, error } = await supabase
            .from('data_store')
            .select('*')
            .eq('key', key)
            .single();
        if (error) return null;
        return data;
    },

    // Activity logging
    logActivity: async (action: string, details: string, status: string) => {
        const { error } = await supabase
            .from('activity_log')
            .insert({
                action,
                details,
                status,
                timestamp: new Date().toISOString()
            });
        if (error) console.error('Failed to log activity:', error);
    },

    // Cost tracking
    logCost: async (service: string, model: string, tokens: number, costUsd: number) => {
        const { error } = await supabase
            .from('cost_log')
            .insert({
                service,
                model,
                tokens,
                cost_usd: costUsd,
                timestamp: new Date().toISOString()
            });
        if (error) console.error('Failed to log cost:', error);
    }
};
