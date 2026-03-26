import { createClient } from '../supabase/client';

const supabase = createClient();

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

export interface Fact {
    key: string;
    value: string;
    source?: string;
}

export const supabaseMemory = {

    // --- MESSAGES ---

    saveMessage: async (role: 'user' | 'assistant', content: string) => {
        const { error } = await supabase
            .from('conversation_messages')
            .insert({ role, content });
        if (error) console.error('[memory] saveMessage error:', error.message);
    },

    getRecentMessages: async (limit = 20): Promise<Message[]> => {
        const { data, error } = await supabase
            .from('conversation_messages')
            .select('role, content, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('[memory] getRecentMessages error:', error.message);
            return [];
        }
        // Return in chronological order for context building
        return (data as Message[]).reverse();
    },

    // --- FACTS ---

    saveFact: async (key: string, value: string, source?: string) => {
        const { error } = await supabase
            .from('conversation_facts')
            .upsert({ key, value, source, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) console.error('[memory] saveFact error:', error.message);
    },

    getFacts: async (): Promise<Fact[]> => {
        const { data, error } = await supabase
            .from('conversation_facts')
            .select('key, value, source')
            .order('updated_at', { ascending: false });
        if (error) {
            console.error('[memory] getFacts error:', error.message);
            return [];
        }
        return data as Fact[];
    },

    // --- FACT EXTRACTION ---
    // Calls the LLM to extract structured facts from a user message.
    // Returns array of {key, value} pairs to persist.
    extractFacts: async (userMessage: string, aiResponse: string): Promise<Fact[]> => {
        try {
            const { chatCompletion } = await import('../openrouter');
            const result = await chatCompletion({
                messages: [
                    {
                        role: 'system',
                        content: `Eres un extractor de hechos. Tu tarea es identificar información factual y persistente que el usuario menciona sobre sí mismo, sus proyectos, preferencias o planes.

Responde SOLO con un JSON array de objetos {key, value, source}. Si no hay nada relevante, responde [].

Ejemplos de hechos a extraer:
- "Estoy trabajando en un proyecto de defensa" → {key: "proyecto_actual", value: "proyecto de defensa", source: "..."}
- "Mi empresa se llama Arecco IA" → {key: "empresa", value: "Arecco IA", source: "..."}
- "Prefiero respuestas cortas" → {key: "preferencia_respuestas", value: "cortas", source: "..."}

No extraigas hechos temporales (el clima, preguntas puntuales) ni información ya conocida como nombre y empresa.`
                    },
                    {
                        role: 'user',
                        content: `Mensaje del usuario: "${userMessage}"\n\nRespuesta del asistente: "${aiResponse.slice(0, 300)}"`
                    }
                ],
                temperature: 0,
            });

            const raw = result.choices[0]?.message?.content?.trim() || '[]';
            // Strip markdown code blocks if present
            const json = raw.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(json) as Fact[];
        } catch (e) {
            console.error('[memory] extractFacts error:', e);
            return [];
        }
    },
};
