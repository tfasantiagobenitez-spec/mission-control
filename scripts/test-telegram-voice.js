

async function testVoice() {
    const payload = {
        update_id: 1234567,
        message: {
            message_id: 100,
            from: { id: 7033503, is_bot: false, first_name: "MockUser" },
            chat: { id: 7033503, first_name: "MockUser", type: "private" },
            date: Date.now() / 1000,
            voice: {
                // To test this we need a valid recent file_id from telegram
                // Since telegram file_id's expire or are specific to bots,
                // we will ask the user to send one real voice message first
                // or we simulate text here if we just want to verify routing.
                // We'll use a dummy ID and expect a "Could not get voice file path" error
                // to at least verify our new branch is executing.
                duration: 2,
                mime_type: "audio/ogg",
                file_id: "AwADBAADbXXXXXXXXXXXXXXX",
                file_unique_id: "AgADbXXXXXXXXXXX",
                file_size: 10240
            }
        }
    };

    try {
        const response = await fetch('http://localhost:3008/api/telegram/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Mock Webhook Response:", data);
    } catch (err) {
        console.error("Error calling webhook:", err);
    }
}

testVoice();
