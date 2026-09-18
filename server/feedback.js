// @ts-check
// The public feedback board: anyone can post and upvote without an account, and the site
// owner moderates with a secret key. Handlers take a web Request and return a Response, so
// they run unchanged as Vercel Functions (api/*.js) and inside the Vite dev server.

import { createHash, timingSafeEqual } from 'node:crypto'
import { Redis } from '@upstash/redis'

/**
 * @typedef {'idea' | 'problem' | 'content' | 'other'} Kind
 * @typedef {'open' | 'planned' | 'doing' | 'done' | 'declined'} Status
 * @typedef {{ id: string, kind: Kind, title: string, body: string, name: string, created: string, status: Status, reply: string, hidden: boolean }} Item
 * @typedef {Item & { votes: number }} CountedItem
 *
 * @typedef {object} Store
 * @property {() => Promise<CountedItem[]>} list Every item, hidden ones included, with its vote count.
 * @property {(id: string) => Promise<Item | null>} get
 * @property {(fields: Omit<Item, 'id'>) => Promise<Item>} create
 * @property {(item: Item) => Promise<void>} put
 * @property {(id: string) => Promise<void>} remove
 * @property {(id: string, voter: string, up: boolean) => Promise<number>} vote Returns the new count.
 * @property {(key: string, limit: number, seconds: number) => Promise<boolean>} allow Fixed-window rate limit.
 *
 * @typedef {{ store: Store | null, adminToken: string, salt: string, now: () => number }} Deps
 */

/** @type {readonly Kind[]} */
export const KINDS = ['idea', 'problem', 'content', 'other']
/** @type {readonly Status[]} */
export const STATUSES = ['open', 'planned', 'doing', 'done', 'declined']
export const LIMITS = { title: 120, body: 2000, name: 40, reply: 1000 }
/** Per IP address, per hour. */
export const RATES = { post: 5, vote: 120, adminFail: 10 }

const ID = /^\d{1,9}$/
const VOTER = /^[A-Za-z0-9-]{16,64}$/
const MAX_BODY_BYTES = 16_000

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/**
 * Keys: fb:seq (id counter), fb:items (hash of id -> item), fb:voters:<id> (set of voter ids),
 * fb:rl:<key> (rate-limit counters that expire).
 * @param {Redis} redis
 * @returns {Store}
 */
export function redisStore(redis) {
  /** @param {unknown} v */
  const parse = (v) => /** @type {Item} */ (typeof v === 'string' ? JSON.parse(v) : v)
  return {
    async list() {
      const all = /** @type {Record<string, unknown> | null} */ (await redis.hgetall('fb:items'))
      const items = Object.values(all ?? {}).map(parse)
      if (!items.length) return []
      const p = redis.pipeline()
      for (const it of items) p.scard(`fb:voters:${it.id}`)
      const counts = await p.exec()
      return items.map((it, i) => ({ ...it, votes: Number(counts[i]) || 0 }))
    },
    async get(id) {
      const v = await redis.hget('fb:items', id)
      return v ? parse(v) : null
    },
    async create(fields) {
      const id = String(await redis.incr('fb:seq'))
      const item = { id, ...fields }
      await redis.hset('fb:items', { [id]: item })
      return item
    },
    async put(item) {
      await redis.hset('fb:items', { [item.id]: item })
    },
    async remove(id) {
      await redis.pipeline().hdel('fb:items', id).del(`fb:voters:${id}`).exec()
    },
    async vote(id, voter, up) {
      const key = `fb:voters:${id}`
      const tx = up ? redis.multi().sadd(key, voter) : redis.multi().srem(key, voter)
      const [, count] = await tx.scard(key).exec()
      return Number(count) || 0
    },
    async allow(key, limit, seconds) {
      const k = `fb:rl:${key}`
      const n = await redis.incr(k)
      if (n === 1) await redis.expire(k, seconds)
      return n <= limit
    },
  }
}

/**
 * For local development and tests. Everything is lost when the process restarts.
 * @param {() => number} [now]
 * @returns {Store}
 */
export function memoryStore(now = Date.now) {
  /** @type {Map<string, Item>} */
  const items = new Map()
  /** @type {Map<string, Set<string>>} */
  const voters = new Map()
  /** @type {Map<string, { n: number, until: number }>} */
  const hits = new Map()
  let seq = 0
  return {
    async list() {
      return [...items.values()].map((it) => ({ ...it, votes: voters.get(it.id)?.size ?? 0 }))
    },
    async get(id) {
      const it = items.get(id)
      return it ? { ...it } : null
    },
    async create(fields) {
      const item = { id: String(++seq), ...fields }
      items.set(item.id, item)
      return { ...item }
    },
    async put(item) {
      items.set(item.id, { ...item })
    },
    async remove(id) {
      items.delete(id)
      voters.delete(id)
    },
    async vote(id, voter, up) {
      let set = voters.get(id)
      if (!set) voters.set(id, (set = new Set()))
      if (up) set.add(voter)
      else set.delete(voter)
      return set.size
    },
    async allow(key, limit, seconds) {
      const t = now()
      const h = hits.get(key)
      if (!h || h.until <= t) {
        hits.set(key, { n: 1, until: t + seconds * 1000 })
        return 1 <= limit
      }
      h.n++
      return h.n <= limit
    },
  }
}

/** @type {Deps | undefined} */
let cached

/**
 * Built once per server instance from the environment. On Vercel, the Upstash Redis integration
 * sets KV_REST_API_URL and KV_REST_API_TOKEN; ADMIN_TOKEN is set by hand.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Deps}
 */
export function deps(env = process.env) {
  if (cached) return cached
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN
  /** @type {Store | null} */
  let store = null
  if (url && token) store = redisStore(new Redis({ url, token }))
  // A memory store on Vercel would forget posts between requests, so refuse instead.
  else if (!env.VERCEL) store = memoryStore()
  cached = { store, adminToken: env.ADMIN_TOKEN ?? '', salt: env.FEEDBACK_SALT ?? env.ADMIN_TOKEN ?? 'biblemap', now: Date.now }
  return cached
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/feedback. The owner (with the admin key) also sees hidden posts.
 * @param {Request} req
 * @param {Deps} d
 */
export async function listFeedback(req, d) {
  if (!d.store) return unavailable()
  let admin = false
  if (req.headers.get('authorization')) {
    const auth = await checkAdmin(req, d)
    if (auth) return auth
    admin = true
  }
  const items = (await d.store.list())
    .filter((it) => admin || !it.hidden)
    .sort((a, b) => b.votes - a.votes || b.created.localeCompare(a.created))
  return json({ items, admin })
}

/**
 * POST /api/feedback { kind, title, body, name, voter, website }. `website` is a honeypot that
 * people never see; bots fill it in. The author's own vote is counted straight away.
 * @param {Request} req
 * @param {Deps} d
 */
export async function createFeedback(req, d) {
  if (!d.store) return unavailable()
  const input = await readJson(req)
  if (input instanceof Response) return input
  if (input.website) return json({ item: null }, 201)
  const title = clean(input.title, LIMITS.title)
  if (title.length < 3) return error(400, 'Please give your post a short title.')
  if (!(await d.store.allow(`post:${ipKey(req, d.salt)}`, RATES.post, 3600))) return error(429, 'That is a lot of posts from here in one hour. Please try again later.')
  const kind = KINDS.find((k) => k === input.kind) ?? 'idea'
  const item = await d.store.create({
    kind,
    title,
    body: clean(input.body, LIMITS.body, true),
    name: clean(input.name, LIMITS.name),
    created: new Date(d.now()).toISOString(),
    status: 'open',
    reply: '',
    hidden: false,
  })
  const voter = String(input.voter ?? '')
  const votes = VOTER.test(voter) ? await d.store.vote(item.id, voter, true) : 0
  return json({ item: { ...item, votes } }, 201)
}

/**
 * POST /api/vote { id, voter, up }. One vote per browser; `up: false` takes it back.
 * @param {Request} req
 * @param {Deps} d
 */
export async function voteFeedback(req, d) {
  if (!d.store) return unavailable()
  const input = await readJson(req)
  if (input instanceof Response) return input
  const id = String(input.id ?? '')
  const voter = String(input.voter ?? '')
  if (!ID.test(id) || !VOTER.test(voter)) return error(400, 'That vote was malformed.')
  const item = await d.store.get(id)
  if (!item || item.hidden) return error(404, 'That post is no longer here.')
  if (!(await d.store.allow(`vote:${ipKey(req, d.salt)}`, RATES.vote, 3600))) return error(429, 'Too many votes from here in one hour. Please try again later.')
  const up = input.up !== false
  const votes = await d.store.vote(id, voter, up)
  return json({ id, votes, up })
}

/**
 * POST /api/moderate { id, status?, reply?, hidden?, delete? } with `Authorization: Bearer <ADMIN_TOKEN>`.
 * @param {Request} req
 * @param {Deps} d
 */
export async function moderateFeedback(req, d) {
  if (!d.store) return unavailable()
  const auth = await checkAdmin(req, d)
  if (auth) return auth
  const input = await readJson(req)
  if (input instanceof Response) return input
  const id = String(input.id ?? '')
  const item = ID.test(id) ? await d.store.get(id) : null
  if (!item) return error(404, 'No post with that id.')
  if (input.delete === true) {
    await d.store.remove(id)
    return json({ id, deleted: true })
  }
  const next = { ...item }
  if (input.status !== undefined) {
    const status = STATUSES.find((s) => s === input.status)
    if (!status) return error(400, `Status must be one of ${STATUSES.join(', ')}.`)
    next.status = status
  }
  if (input.reply !== undefined) next.reply = clean(input.reply, LIMITS.reply, true)
  if (input.hidden !== undefined) next.hidden = input.hidden === true
  await d.store.put(next)
  return json({ item: next })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an error Response, or null when the request carries the admin key.
 * @param {Request} req
 * @param {Deps} d
 */
async function checkAdmin(req, d) {
  if (!d.adminToken) return error(503, 'Moderation is off until ADMIN_TOKEN is set.')
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (sameSecret(given, d.adminToken)) return null
  if (!(await /** @type {Store} */ (d.store).allow(`admin-fail:${ipKey(req, d.salt)}`, RATES.adminFail, 3600))) return error(429, 'Too many wrong keys. Try again in an hour.')
  return error(401, 'That admin key is not right.')
}

/** @param {string} a @param {string} b */
function sameSecret(a, b) {
  const h = (/** @type {string} */ s) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(a), h(b))
}

/**
 * A salted hash of the caller's IP address, used only as a rate-limit key that expires within an hour.
 * @param {Request} req
 * @param {string} salt
 */
export function ipKey(req, salt) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 20)
}

/**
 * Trim, drop control characters, and cap the length. Multi-line text keeps single blank lines.
 * @param {unknown} v
 * @param {number} max
 * @param {boolean} [multiline]
 */
export function clean(v, max, multiline = false) {
  if (typeof v !== 'string') return ''
  let s = v.replace(/\r\n?/g, '\n')
  s = multiline ? s.replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ')
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[ --]/g, '').trim()
  return [...s].slice(0, max).join('').trim()
}

/**
 * @param {Request} req
 * @returns {Promise<Record<string, unknown> | Response>}
 */
async function readJson(req) {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return error(415, 'Send JSON.')
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) return error(413, 'That is too long.')
  try {
    const v = JSON.parse(text)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : error(400, 'Send a JSON object.')
  } catch {
    return error(400, 'That was not valid JSON.')
  }
}

/** @param {unknown} data @param {number} [status] */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

/** @param {number} status @param {string} message */
function error(status, message) {
  return json({ error: message }, status)
}

function unavailable() {
  return error(503, 'The feedback board is not connected to its database yet.')
}
