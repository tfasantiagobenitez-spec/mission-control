const fs = require('fs');
const path = require('path');

async function verifyCalendarAgent() {
    console.log('🔍 Verifying Calendar Control Agent Setup...\n');

    // 1. Check Env
    const envPath = 'C:/Users/benit/.openclaw/.env';
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file missing at', envPath);
    } else {
        const env = fs.readFileSync(envPath, 'utf8');
        const hasToken = env.includes('CLICKUP_API_TOKEN');
        const hasList = env.includes('CLICKUP_LIST_ID');
        const hasBot = env.includes('TELEGRAM_BOT_TOKEN');

        console.log(hasToken ? '✅ ClickUp Token present' : '❌ ClickUp Token MISSING');
        console.log(hasList ? '✅ ClickUp List ID present' : '❌ ClickUp List ID MISSING');
        console.log(hasBot ? '✅ Telegram Bot Token present' : '❌ Telegram Bot Token MISSING');
    }

    // 2. Verify File Structure
    const paths = [
        'src/app/api/agents/calendar/route.ts',
        'src/app/agents/calendar-control/page.tsx',
        'src/app/agents/calendar-control/CalendarControl.css',
        'src/app/api/telegram/webhook/route.ts'
    ];

    console.log('\n📂 Verifying local files:');
    paths.forEach(p => {
        const fullPath = path.join(process.cwd(), p);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${p}`);
        } else {
            console.error(`❌ MISSING: ${p}`);
        }
    });

    console.log('\n✨ Verification complete! If all files are present and env is correct, you can view the agent at /agents/calendar-control');
}

verifyCalendarAgent();
