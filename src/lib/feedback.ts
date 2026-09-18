/** Client for the feedback board (server/feedback.js). No accounts: each browser gets a random voter id. */

export type FeedbackKind = 'idea' | 'problem' | 'content' | 'other'
export type FeedbackStatus = 'open' | 'planned' | 'doing' | 'done' | 'declined'

export interface FeedbackItem {
  id: string
  kind: FeedbackKind
  title: string
  body: string
  name: string
  created: string
  status: FeedbackStatus
  reply: string
  hidden: boolean
  votes: number
}

export const KIND_LABELS: Record<FeedbackKind, string> = { idea: 'Idea', problem: 'Problem', content: 'Bible content', other: 'Other' }
export const STATUS_LABELS: Record<FeedbackStatus, string> = { open: 'Open', planned: 'Planned', doing: 'In progress', done: 'Done', declined: 'Not planned' }
export const LIMITS = { title: 120, body: 2000, name: 40, reply: 1000 }

const VOTER_KEY = 'biblemap.voter'
const VOTED_KEY = 'biblemap.voted'
const ADMIN_KEY = 'biblemap.adminKey'

// Storage can be missing or throw (private windows, blocked site data); the board still works without it.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* not saved; fine */
  }
}

export function voterId(): string {
  let id = read(VOTER_KEY)
  if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
    write(VOTER_KEY, id)
  }
  return id
}

export function loadVoted(): Set<string> {
  try {
    const v = JSON.parse(read(VOTED_KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v.map(String) : [])
  } catch {
    return new Set()
  }
}
export function saveVoted(ids: Set<string>) {
  write(VOTED_KEY, JSON.stringify([...ids]))
}

export const adminKey = {
  get: () => read(ADMIN_KEY) ?? '',
  set: (v: string) => write(ADMIN_KEY, v || null),
}

async function call<T>(path: string, init: { method?: string; body?: unknown; admin?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (init.body !== undefined) headers['content-type'] = 'application/json'
  const key = adminKey.get()
  if (init.admin && key) headers.authorization = `Bearer ${key}`
  const res = await fetch(`${import.meta.env.BASE_URL}api/${path}`, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* a static host answers with HTML; handled below */
  }
  if (!res.ok || !data) throw new Error((data as { error?: string } | null)?.error ?? 'The feedback board is not reachable right now.')
  return data as T
}

export const feedbackApi = {
  list: (admin: boolean) => call<{ items: FeedbackItem[]; admin: boolean }>('feedback', { admin }),
  create: (post: { kind: FeedbackKind; title: string; body: string; name: string; website: string }) => call<{ item: FeedbackItem | null }>('feedback', { method: 'POST', body: { ...post, voter: voterId() } }),
  vote: (id: string, up: boolean) => call<{ id: string; votes: number; up: boolean }>('vote', { method: 'POST', body: { id, up, voter: voterId() } }),
  moderate: (id: string, patch: { status?: FeedbackStatus; reply?: string; hidden?: boolean; delete?: boolean }) => call<{ item?: FeedbackItem; deleted?: boolean }>('moderate', { method: 'POST', body: { id, ...patch }, admin: true }),
}
