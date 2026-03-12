import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using URL:', url);

if (!url || !key) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
    try {
        console.log(`Connecting to ${url}...`);
        const { data, error } = await supabase.from('agents').select('*').limit(1);

        if (error) {
            console.error('Error connecting to Supabase with anon key:', error.message);
        } else {
            console.log('Successfully connected with anon key. Data:', data);
        }

        if (serviceKey) {
            const supabaseAdmin = createClient(url, serviceKey);
            const { data: adminData, error: adminError } = await supabaseAdmin.from('agents').select('*').limit(1);
            if (adminError) {
                console.error('Error connecting to Supabase with service key:', adminError.message);
            } else {
                console.log('Successfully connected with service key. Data:', adminData);
            }
        }
    } catch (err) {
        console.error('Exception during Supabase connection:', err);
    }
}

testConnection();
