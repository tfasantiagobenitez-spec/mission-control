/**
 * ClickUp REST API v2 integration
 * https://clickup.com/api/
 */

const CLICKUP_API_KEY = process.env.CLICKUP_API_TOKEN!
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID!
const BASE_URL = 'https://api.clickup.com/api/v2'

async function clickupFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': CLICKUP_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ClickUp API error ${res.status}: ${text}`)
  }
  return res.json()
}

export interface CreateTaskOptions {
  name: string
  description?: string
  dueDate?: Date
  tags?: string[]
}

/**
 * Create a task in the configured ClickUp list.
 * Returns the created task id.
 */
export async function createTask(options: CreateTaskOptions): Promise<string> {
  const body: Record<string, unknown> = {
    name: options.name,
    status: 'to do',
    tags: options.tags || ['crm', 'from-meeting'],
  }

  if (options.description) {
    body.description = options.description
  }

  if (options.dueDate) {
    body.due_date = options.dueDate.getTime()
    body.due_date_time = true
  }

  const result = await clickupFetch(`/list/${CLICKUP_LIST_ID}/task`, {
    method: 'POST',
    body: JSON.stringify(body)
  })

  return result.id
}

/**
 * Update task name/status (e.g., mark complete).
 */
export async function updateTask(taskId: string, updates: { name?: string; status?: string }) {
  return clickupFetch(`/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  })
}
