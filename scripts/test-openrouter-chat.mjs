import fs from 'fs'

const apiKey = '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'
const baseUrl = 'https://openrouter.ai/api/v1'

async function runTest() {
    console.log("Testing chat completion...")
    try {
        const body = {
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
                { role: 'system', content: 'Eres Santi.' },
                { role: 'user', content: 'Hola, ¿quién eres?' }
            ]
        }
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        })

        console.log("Status:", res.status)
        const text = await res.text()
        console.log("Response:", text)
    } catch (e) {
        console.error("Error:", e)
    }
}
runTest()
