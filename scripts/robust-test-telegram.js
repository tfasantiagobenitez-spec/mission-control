
const token = '8055168892:AAFjnwAKcdcCyqA8BfkUT5ROmr3I4gU_JmA';

async function test() {
    console.log('Testing Telegram Bot Connection...');
    try {
        const url = `https://api.telegram.org/bot${token}/getMe`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Success! Bot Info:', JSON.stringify(data.result, null, 2));
        } else {
            console.error('❌ Telegram API error:', data);
        }
    } catch (e) {
        console.error('❌ Network/Fetch error:', e.message);
    }
}

test();
