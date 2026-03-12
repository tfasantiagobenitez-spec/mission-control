// trace.js
import fs from 'fs/promises'
import path from 'path'
import { config } from '../src/lib/config.js'
import { chatCompletion } from '../src/lib/openrouter.js'

async function run() {
    try {
        const userMdPath = path.join(config.openclaw.home, 'workspace', 'USER.md')
        console.log('Reading USER.md from:', userMdPath)
        const userMdContent = await fs.readFile(userMdPath, 'utf-8')
        console.log('USER.md Length:', userMdContent.length)

        const messages = [
            {
                role: 'system',
                content: `Eres el asistente personal de Santi. Usa este contexto para responder y guiar tu tono:\n\n${userMdContent}`
            },
            {
                role: 'user',
                content: "Hola, ¿cómo me llamo y de qué trabajo?"
            }
        ]

        console.log('Calling OpenRouter chatCompletion...')
        const completion = await chatCompletion({ messages, temperature: 0.7 })
        console.log('OpenRouter responded:', completion.choices[0]?.message?.content)
    } catch (e) {
        console.error("Trace Error:", e)
    }
}
run()
