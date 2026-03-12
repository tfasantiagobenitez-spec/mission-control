// Mocks for Vercel/Serverless where SQLite/Pinecone are currently broken/not supported
const sqliteMemory: any = { getFacts: () => [], getRecentMessages: () => [], getLatestSummary: () => undefined, saveMessage: () => { }, pruneMessages: () => { } };
const pineconeMemory: any = { searchConversations: async (...args: any[]) => [], storeExchange: async (...args: any[]) => { } };
import { supabaseStore } from './memory/supabase-store';

export interface AgentContext {
    coreFacts: any[];
    recentMessages: any[];
    conversationSummary?: string;
    semanticMatches: any[];
}

export const agentOrchestrator = {
    /**
     * Parallel loading of all memory tiers
     */
    loadMemory: async (query: string): Promise<AgentContext> => {
        const [coreFacts, recentMessages, conversationSummary, semanticMatches] = await Promise.all([
            Promise.resolve(sqliteMemory.getFacts()),
            Promise.resolve(sqliteMemory.getRecentMessages(20)),
            Promise.resolve(sqliteMemory.getLatestSummary()),
            pineconeMemory.searchConversations(query, 3).catch(() => []) // Graceful degradation
        ]);

        return {
            coreFacts,
            recentMessages,
            conversationSummary: conversationSummary?.summary,
            semanticMatches
        };
    },

    /**
     * Fire-and-forget background operations
     */
    processBackgroundTasks: async (userMessage: string, assistantResponse: string) => {
        // Run in background, don't await
        (async () => {
            try {
                // Tier 1: Save messages
                sqliteMemory.saveMessage('user', userMessage);
                sqliteMemory.saveMessage('assistant', assistantResponse);

                // Tier 1: Prune/Compact if needed
                sqliteMemory.pruneMessages(30);

                // Tier 1: Fact extraction (Mocked here - in real implementation this calls an LLM)
                console.log('Extracting facts in background...');

                // Tier 2: Embed and store exchange
                const exchangeId = `msg_${Date.now()}`;
                await pineconeMemory.storeExchange(exchangeId, userMessage, 'user').catch((e: any) => console.error('Pinecone error:', e));

                // Tier 3: Log activity
                await supabaseStore.logActivity('message_processed', 'User interaction handled', 'success');

                // Tier 3: Log cost (Mocked)
                await supabaseStore.logCost('openai', 'gpt-4o', 500, 0.01);
            } catch (error) {
                console.error('Error in agent background tasks:', error);
            }
        })();
    }
};
