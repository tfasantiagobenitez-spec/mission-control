/**
 * NotebookLM Integration Helper
 * Syncs knowledge base sources to a NotebookLM notebook automatically.
 * Uses notebooklm-kit to interact with the NotebookLM API via Google session cookies.
 */

import { NotebookLMClient } from 'notebooklm-kit'
import { createClient } from '@supabase/supabase-js'

const KB_NOTEBOOK_TITLE = '🧠 Knowledge Base'
const SETTING_KEY = 'notebooklm_kb_notebook_id'

// Cached notebook ID to avoid repeated lookups
let _cachedNotebookId: string | null = null

function getClient(): NotebookLMClient {
  const sessionId = process.env.GOOGLE_SESSION_ID
  const sessionIdTs = process.env.GOOGLE_SESSION_IDTS

  if (!sessionId || !sessionIdTs) {
    throw new Error('NotebookLM: GOOGLE_SESSION_ID and GOOGLE_SESSION_IDTS env vars are required')
  }

  return new NotebookLMClient({
    cookies: `__Secure-1PSID=${sessionId}; __Secure-1PSIDTS=${sessionIdTs};`,
  })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Retrieves the KB notebook ID from Supabase cache.
 */
async function getStoredNotebookId(): Promise<string | null> {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .single()
    return data?.value || null
  } catch {
    return null
  }
}

/**
 * Saves the KB notebook ID to Supabase for future reuse.
 */
async function storeNotebookId(notebookId: string): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase
      .from('app_settings')
      .upsert({ key: SETTING_KEY, value: notebookId }, { onConflict: 'key' })
  } catch (e) {
    console.error('[NotebookLM] Failed to store notebook ID:', e)
  }
}

/**
 * Gets or creates the "🧠 Knowledge Base" notebook in NotebookLM.
 * Caches the notebook ID in memory and in Supabase.
 */
export async function getOrCreateKBNotebook(): Promise<string> {
  // 1. In-memory cache
  if (_cachedNotebookId) return _cachedNotebookId

  // 2. Supabase cache
  const stored = await getStoredNotebookId()
  if (stored) {
    _cachedNotebookId = stored
    return stored
  }

  // 3. Search existing notebooks
  const sdk = getClient()
  await sdk.connect()
  const notebooks = await sdk.notebooks.list()

  const existing = notebooks.find((nb: { title?: string; projectId?: string }) =>
    nb.title === KB_NOTEBOOK_TITLE
  )

  if (existing?.projectId) {
    _cachedNotebookId = existing.projectId
    await storeNotebookId(existing.projectId)
    return existing.projectId
  }

  // 4. Create the notebook
  const created = await sdk.notebooks.create({ title: KB_NOTEBOOK_TITLE })
  _cachedNotebookId = created.projectId
  await storeNotebookId(created.projectId)

  console.error(`[NotebookLM] Created KB notebook: ${created.projectId}`)
  return created.projectId
}

/**
 * Adds a URL source (YouTube video or web article) to the KB notebook.
 */
export async function addUrlToKBNotebook(url: string): Promise<void> {
  const notebookId = await getOrCreateKBNotebook()
  const sdk = getClient()
  await sdk.connect()
  await sdk.sources.addFromURL(notebookId, { url })
  console.error(`[NotebookLM] Added URL source: ${url}`)
}

/**
 * Adds a plain text source (PDF content, raw text) to the KB notebook.
 */
export async function addTextToKBNotebook(title: string, content: string): Promise<void> {
  const notebookId = await getOrCreateKBNotebook()
  const sdk = getClient()
  await sdk.connect()
  // NotebookLM has a limit, truncate at 500k chars to be safe
  const truncated = content.slice(0, 500_000)
  await sdk.sources.addFromText(notebookId, { title, content: truncated })
  console.error(`[NotebookLM] Added text source: ${title}`)
}
