import { supabaseStore } from './memory/supabase-store';
import { supabaseMemory } from './memory/supabase-memory';

export interface AgentContext {
    coreFacts: any[];
    recentMessages: any[];
    conversationSummary?: string;
    semanticMatches: any[];
}

export const agentOrchestrator = {
    /**
     * Load memory from Supabase: recent messages + extracted facts
     */
    loadMemory: async (_query: string): Promise<AgentContext> => {
        const [coreFacts, recentMessages] = await Promise.all([
            supabaseMemory.getFacts().catch(() => []),
            supabaseMemory.getRecentMessages(20).catch(() => []),
        ]);

        return {
            coreFacts,
            recentMessages,
            conversationSummary: undefined,
            semanticMatches: [],
        };
    },

    /**
     * Fire-and-forget: save messages + extract facts in background
     */
    processBackgroundTasks: async (userMessage: string, assistantResponse: string) => {
        (async () => {
            try {
                await Promise.all([
                    supabaseMemory.saveMessage('user', userMessage),
                    supabaseMemory.saveMessage('assistant', assistantResponse),
                ]);

                // Extract and persist facts from this exchange
                const facts = await supabaseMemory.extractFacts(userMessage, assistantResponse);
                for (const fact of facts) {
                    await supabaseMemory.saveFact(fact.key, fact.value, fact.source);
                }

                await supabaseStore.logActivity('message_processed', 'User interaction handled', 'success');
            } catch (error) {
                console.error('[agent] background tasks error:', error);
            }
        })();
    },

    /**
     * Fire-and-forget: only extract facts (messages already saved synchronously)
     */
    extractFactsInBackground: (userMessage: string, assistantResponse: string) => {
        (async () => {
            try {
                const facts = await supabaseMemory.extractFacts(userMessage, assistantResponse);
                for (const fact of facts) {
                    await supabaseMemory.saveFact(fact.key, fact.value, fact.source);
                }
                await supabaseStore.logActivity('message_processed', 'User interaction handled', 'success');
            } catch (error) {
                console.error('[agent] extractFactsInBackground error:', error);
            }
        })();
    }
};
