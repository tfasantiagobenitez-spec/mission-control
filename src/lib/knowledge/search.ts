/**
 * Knowledge Base Semantic Search
 * Searches Pinecone 'knowledge-base' index and returns relevant chunks
 */

import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
const INDEX_NAME = 'knowledge-base'
const NAMESPACE = 'knowledge'

export interface KnowledgeResult {
  text: string
  title: string
  sourceUrl: string
  sourceType: string
  score: number
  chunkIndex: number
}

/**
 * Search the knowledge base with natural language query.
 * Uses Pinecone integrated embedding (llama-text-embed-v2).
 */
export async function searchKnowledge(query: string, topK = 5): Promise<KnowledgeResult[]> {
  try {
    const index = pinecone.index(INDEX_NAME).namespace(NAMESPACE)

    const results = await index.searchRecords({
      query: { inputs: { text: query }, topK: topK * 2 },
      rerank: {
        model: 'bge-reranker-v2-m3',
        rankFields: ['text'],
        topN: topK,
        query: query
      }
    })

    return (results.result?.hits || []).map((hit: any) => ({
      text: hit.fields?.text || '',
      title: hit.fields?.title || '',
      sourceUrl: hit.fields?.source_url || '',
      sourceType: hit.fields?.source_type || '',
      score: hit['@score'] || 0,
      chunkIndex: hit.fields?.chunk_index || 0
    }))
  } catch (err) {
    console.error('[knowledge/search] Error:', err)
    return []
  }
}

/**
 * Format knowledge results for injection into LLM system prompt.
 */
export function formatKnowledgeContext(results: KnowledgeResult[]): string {
  if (results.length === 0) return ''

  let ctx = `\n\n=== BASE DE CONOCIMIENTO ===\n`
  ctx += `(Fragmentos relevantes de tu knowledge base personal)\n\n`

  results.forEach((r, i) => {
    const source = r.title || r.sourceUrl
    ctx += `[${i + 1}] *${source}*\n`
    ctx += `${r.text.slice(0, 400)}${r.text.length > 400 ? '...' : ''}\n\n`
  })

  ctx += `=============================\n`
  return ctx
}

/**
 * Quick check: does the knowledge base have any content?
 */
export async function knowledgeBaseHasContent(): Promise<boolean> {
  try {
    const index = pinecone.index(INDEX_NAME)
    const stats = await index.describeIndexStats()
    const nsStats = (stats.namespaces as any)?.[NAMESPACE]
    return (nsStats?.recordCount || nsStats?.vectorCount || 0) > 0
  } catch {
    return false
  }
}
