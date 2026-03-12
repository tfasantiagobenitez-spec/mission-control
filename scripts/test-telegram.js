const https = require('https');
const fs = require('fs');
const path = require('path');

function getBotToken() {
    const envPath = 'C:/Users/benit/.openclaw/.env';
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env file not found at', envPath);
        return null;
    }
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m);
    return match ? match[1].trim() : null;
}

function checkTelegram() {
    const token = getBotToken();
    if (!token) {
        console.error('Error: TELEGRAM_BOT_TOKEN not found in .env');
        process.exit(1);
    }

    const url = `https://api.telegram.org/bot${token}/getMe`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            const response = JSON.parse(data);
            if (response.ok) {
                console.log('✅ Telegram Bot Status: OK');
                console.log('Bot Info:', JSON.stringify(response.result, null, 2));
            } else {
                console.error('❌ Error connecting to Telegram:', response);
                process.exit(1);
            }
        });
    }).on('error', (err) => {
        console.error('❌ Network Error:', err.message);
        process.exit(1);
    });
}

checkTelegram();
