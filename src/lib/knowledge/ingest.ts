/**
 * Knowledge Base Ingest Pipeline
 * Supports: YouTube videos, web articles, PDFs, plain text
 * Storage: Pinecone (knowledge-base index) + Supabase (kb_sources metadata)
 */

import { createClient } from '@supabase/supabase-js'
import { Pinecone } from '@pinecone-database/pinecone'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
const INDEX_NAME = 'knowledge-base'
const NAMESPACE = 'knowledge'
const CHUNK_SIZE = 512    // tokens approx (chars / 4)
const CHUNK_OVERLAP = 50  // token overlap between chunks

// ── Type Detection ─────────────────────────────────────────────────────────────

export type SourceType = 'youtube' | 'article' | 'pdf' | 'notebooklm' | 'text'

export function detectSourceType(input: string): SourceType {
  if (/youtube\.com\/watch|youtu\.be\//.test(input)) return 'youtube'
  if (/youtube\.com\/@|youtube\.com\/channel\/|youtube\.com\/c\//.test(input)) return 'youtube'
  if (input.startsWith('http') || input.startsWith('https')) return 'article'
  if (input.endsWith('.pdf')) return 'pdf'
  return 'text'
}

export function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

// ── Text Chunking ─────────────────────────────────────────────────────────────

export function chunkText(text: string, maxChars = CHUNK_SIZE * 4, overlap = CHUNK_OVERLAP * 4): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    chunks.push(text.slice(start, end).trim())
    start += maxChars - overlap
    if (start >= text.length) break
  }
  return chunks.filter(c => c.length > 50) // discard tiny chunks
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  const { YoutubeTranscript } = await import('youtube-transcript')
  const items = await YoutubeTranscript.fetchTranscript(videoId)
  return items.map(i => i.text).join(' ')
}

export async function fetchArticleText(url: string): Promise<{ text: string; title: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)' }
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const html = await res.text()

  const { load } = await import('cheerio')
  const $ = load(html)

  // Remove noise
  $('script, style, nav, footer, header, aside, .ad, .sidebar, [role="banner"]').remove()

  const title = $('title').text().trim() || $('h1').first().text().trim() || url
  const text = $('article, main, .content, .post-content, body')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim()

  return { text, title }
}

export async function fetchYouTubeVideoTitle(videoId: string): Promise<string> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return videoId
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
  )
  const json = await res.json()
  return json.items?.[0]?.snippet?.title || videoId
}

// ── AI Summary Generation ─────────────────────────────────────────────────────

async function generateSummary(text: string, title: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return title

  const snippet = text.slice(0, 3000)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize this content in 2-3 sentences in Spanish. Be concise and capture the key ideas.' },
        { role: 'user', content: `Title: ${title}\n\nContent: ${snippet}` }
      ],
      max_tokens: 150
    })
  })
  const json = await res.json()
  return json.choices?.[0]?.message?.content || title
}

// ── Main Ingest Function ──────────────────────────────────────────────────────

export interface IngestResult {
  sourceId: string
  title: string
  chunkCount: number
  summary: string
  alreadyExists: boolean
}

export async function ingestSource(
  input: string,
  type?: SourceType,
  rawText?: string
): Promise<IngestResult> {
  const detectedType = type || detectSourceType(input)
  let text = rawText || ''
  let title = input

  // ── Fetch content based on type ──
  if (!rawText) {
    if (detectedType === 'youtube') {
      const videoId = extractYoutubeVideoId(input)
      if (!videoId) throw new Error('Invalid YouTube URL')
      ;[text, title] = await Promise.all([
        fetchYouTubeTranscript(videoId),
        fetchYouTubeVideoTitle(videoId)
      ])
    } else if (detectedType === 'article') {
      const result = await fetchArticleText(input)
      text = result.text
      title = result.title
    } else {
      throw new Error('rawText required for pdf/notebooklm/text types')
    }
  }

  if (!text || text.length < 50) throw new Error('No meaningful content found')

  // ── Check if already ingested ──
  const { data: existing } = await supabase
    .from('kb_sources')
    .select('id, title, chunk_count')
    .eq('url', input)
    .single()

  if (existing) {
    return {
      sourceId: existing.id,
      title: existing.title || title,
      chunkCount: existing.chunk_count,
      summary: '',
      alreadyExists: true
    }
  }

  // ── Chunk and embed via Pinecone ──
  const chunks = chunkText(text)
  const index = pinecone.index(INDEX_NAME).namespace(NAMESPACE)
  const sourceId = crypto.randomUUID()

  const records = chunks.map((chunk, i) => ({
    _id: `${sourceId}_${i}`,
    text: chunk,
    source_id: sourceId,
    source_url: input,
    source_type: detectedType,
    title,
    chunk_index: i,
    ingested_at: new Date().toISOString()
  }))

  // Upsert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    await index.upsertRecords({ records: records.slice(i, i + 100) })
  }

  // ── Generate AI summary ──
  const summary = await generateSummary(text, title)

  // ── Save metadata to Supabase ──
  await supabase.from('kb_sources').insert({
    id: sourceId,
    url: input,
    type: detectedType,
    title,
    chunk_count: chunks.length,
    summary
  })

  return { sourceId, title, chunkCount: chunks.length, summary, alreadyExists: false }
}
