const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokenData } = await supabase.from('google_tokens').select('*').limit(1).single();

    if (!tokenData) return console.log("No token");

    // 1. Check primary calendar events starting from start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Start of today local time

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfToday.toISOString())}&maxResults=10&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    if (!res.ok) {
        // May need refresh, just try...
        console.log("Error:", await res.text());
        return;
    }
    const data = await res.json();
    console.log(`Found ${data.items.length} events in primary calendar start of today:`);
    data.items.forEach(i => console.log(i.summary, i.start.dateTime || i.start.date));
}
check();
