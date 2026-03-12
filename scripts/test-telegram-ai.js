// Simulate a Telegram webhook payload
const payload = {
    update_id: 123456789,
    message: {
        message_id: 1,
        from: {
            id: 1111111,
            is_bot: false,
            first_name: "TestUser",
            username: "testuser",
            language_code: "es"
        },
        chat: {
            id: 1111111,
            first_name: "TestUser",
            username: "testuser",
            type: "private"
        },
        date: Math.floor(Date.now() / 1000),
        text: "Hola, ¿cómo me llamo y de qué trabajo?"
    }
}

async function runTest() {
    try {
        console.log("Sending simulated payload to localhost:3000/api/telegram/webhook...")
        const res = await fetch('http://localhost:3008/api/telegram/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await res.json()
        console.log("Response status:", res.status)
        console.log("Response body:", data)
    } catch (e) {
        console.error("Test failed:", e)
    }
}

runTest()
