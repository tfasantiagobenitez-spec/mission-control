/**
 * NotebookLM Integration Helper
 * Syncs knowledge base sources to a NotebookLM notebook automatically.
 * Uses notebooklm-kit to interact with the NotebookLM API via Google session cookies.
 */

import { createClient } from '@supabase/supabase-js'

const KB_NOTEBOOK_TITLE = '🧠 Knowledge Base'
const SETTING_KEY = 'notebooklm_kb_notebook_id'

// Cached notebook ID to avoid repeated lookups
let _cachedNotebookId: string | null = null

interface PageParams {
  authToken: string
  fSid: string
  bl: string
}

/**
 * Fetches fresh page params (SNlM0e, f.sid, bl) from the NotebookLM page.
 * This avoids manually updating GOOGLE_AUTH_TOKEN and keeps the build label current.
 */
async function getPageParams(cookies: string): Promise<PageParams> {
  const res = await fetch('https://notebooklm.google.com/', {
    headers: {
      'Cookie': cookies,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    }
  })
  if (!res.ok) throw new Error(`Failed to load NotebookLM page: ${res.status}`)
  const html = await res.text()

  const authToken = html.match(/"SNlM0e":"([^"]+)"/)?.[1]
  const fSid = html.match(/"FdrFJe":"([^"]+)"/)?.[1]
  const bl = html.match(/"cfb2h":"([^"]+)"/)?.[1]

  if (!authToken) throw new Error('SNlM0e token not found — cookies may be expired')

  return {
    authToken,
    fSid: fSid || '-7121977511756781186',
    bl: bl || 'boq_labs-tailwind-frontend_20260319.10_p0',
  }
}

async function getClient(): Promise<any> {
  const { NotebookLMClient } = await import('notebooklm-kit')
  const cookies = process.env.GOOGLE_COOKIES
  if (!cookies) throw new Error('NotebookLM: GOOGLE_COOKIES env var is required')

  const params = await getPageParams(cookies)
  console.log('[NotebookLM] Page params fetched, bl:', params.bl)

  return new NotebookLMClient({
    authToken: params.authToken,
    cookies,
    urlParams: {
      'bl': params.bl,
      'f.sid': params.fSid,
    }
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
 * Gets or creates the "🧠 Knowledge Base" notebook using an already-connected SDK instance.
 */
async function resolveKBNotebook(sdk: any): Promise<string> {
  if (_cachedNotebookId) return _cachedNotebookId

  const stored = await getStoredNotebookId()
  if (stored) {
    _cachedNotebookId = stored
    return stored
  }

  const notebooks = await sdk.notebooks.list()
  const existing = notebooks.find((nb: { title?: string; projectId?: string }) =>
    nb.title === KB_NOTEBOOK_TITLE
  )

  if (existing?.projectId) {
    _cachedNotebookId = existing.projectId
    await storeNotebookId(existing.projectId)
    return existing.projectId
  }

  const created = await sdk.notebooks.create({ title: KB_NOTEBOOK_TITLE })
  _cachedNotebookId = created.projectId
  await storeNotebookId(created.projectId)
  console.log(`[NotebookLM] Created KB notebook: ${created.projectId}`)
  return created.projectId
}

/**
 * Adds a URL source (YouTube video or web article) to the KB notebook.
 */
export async function addUrlToKBNotebook(url: string): Promise<void> {
  const sdk = await getClient()
  await sdk.connect()
  const notebookId = await resolveKBNotebook(sdk)
  await sdk.sources.addFromURL(notebookId, { url })
  console.log(`[NotebookLM] Added URL source: ${url}`)
}

/**
 * Adds a plain text source (PDF content, raw text) to the KB notebook.
 */
export async function addTextToKBNotebook(title: string, content: string): Promise<void> {
  const sdk = await getClient()
  await sdk.connect()
  const notebookId = await resolveKBNotebook(sdk)
  // NotebookLM has a limit, truncate at 500k chars to be safe
  const truncated = content.slice(0, 500_000)
  await sdk.sources.addFromText(notebookId, { title, content: truncated })
  console.log(`[NotebookLM] Added text source: ${title}`)
}

/**
 * Queries the KB notebook using NotebookLM's AI.
 * Returns the response text, or null if it fails.
 * If SNlM0e token is expired, auto-fetches a new one from the page.
 */
export async function queryKBNotebook(question: string): Promise<string | null> {
  const notebookId = process.env.NOTEBOOKLM_KB_NOTEBOOK_ID
  if (!notebookId) return '❌ ERROR: NOTEBOOKLM_KB_NOTEBOOK_ID not set'

  const cookies = process.env.GOOGLE_COOKIES
  if (!cookies) return '❌ ERROR: GOOGLE_COOKIES not set'

  async function attempt(): Promise<string | null> {
    const { NotebookLMClient } = await import('notebooklm-kit')
    const params = await getPageParams(cookies!)
    const sdk = new NotebookLMClient({
      authToken: params.authToken,
      cookies,
      urlParams: { 'bl': params.bl, 'f.sid': params.fSid },
    })
    await sdk.connect()
    const response = await sdk.generation.chat(notebookId!, question)
    return response?.text || null
  }

  try {
    return await attempt()
  } catch (e: any) {
    const msg = e?.message || String(e)
    // If it's an auth error, retry once (cookies might have been refreshed)
    if (msg.includes('Unauthenticated') || msg.includes('Authentication') || msg.includes('401')) {
      console.log('[NotebookLM] Auth error, retrying...')
      try {
        return await attempt()
      } catch (e2: any) {
        const msg2 = e2?.message || String(e2)
        console.error('[NotebookLM] queryKBNotebook error (retry):', msg2)
        return `❌ ERROR NotebookLM: ${msg2}`
      }
    }
    console.error('[NotebookLM] queryKBNotebook error:', msg)
    return `❌ ERROR NotebookLM: ${msg}`
  }
}
