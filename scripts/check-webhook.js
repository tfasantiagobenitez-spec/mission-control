const token = process.env.TELEGRAM_BOT_TOKEN || '8055168892:AAFjnwAKcdcCyqA8BfkUT5ROmr3I4gU_JmA';
async function getWebhookInfo() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const data = await response.json();
        console.log("Webhook Info:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error fetching webhook info:", e);
    }
}
getWebhookInfo();
