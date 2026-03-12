const config = {
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY || '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',
        baseUrl: 'https://openrouter.ai/api/v1'
    }
}

async function test() {
    try {
        console.log("Checking OpenRouter Models...")
        const res = await fetch(`${config.openrouter.baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${config.openrouter.apiKey}`
            }
        })
        console.log("Status:", res.status)
        if (!res.ok) {
            console.log(await res.text())
        } else {
            console.log("OpenRouter Connection OK!")
        }
    } catch (e) {
        console.error("Fetch Error:", e)
    }
}
test()
