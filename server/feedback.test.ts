import { afterEach, describe, expect, it, vi } from 'vitest'
import { Redis } from '@upstash/redis'
import { RATES, clean, createFeedback, listFeedback, memoryStore, moderateFeedback, redisStore, voteFeedback } from './feedback.js'

const VOTER_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const VOTER_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const ADMIN = 'correct-horse-battery-staple'

function req(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/x', {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/**
 * Just enough of Upstash's REST API to run the real client against: single commands, /pipeline and
 * /multi-exec, with base64-encoded string results as the client asks for.
 */
function fakeUpstash() {
  const hashes = new Map<string, Map<string, string>>()
  const sets = new Map<string, Set<string>>()
  const counters = new Map<string, number>()
  const hash = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!
  const set = (k: string) => sets.get(k) ?? sets.set(k, new Set()).get(k)!
  const run = (cmd: unknown[]): unknown => {
    const [name, key, ...args] = cmd.map(String)
    switch (name.toLowerCase()) {
      case 'hgetall':
        return [...(hashes.get(key) ?? new Map())].flat()
      case 'hget':
        return hashes.get(key)?.get(args[0]) ?? null
      case 'hset': {
        const h = hash(key)
        let added = 0
        for (let i = 0; i < args.length; i += 2) {
          if (!h.has(args[i])) added++
          h.set(args[i], args[i + 1])
        }
        return added
      }
      case 'hdel':
        return args.filter((f) => hashes.get(key)?.delete(f)).length
      case 'del':
        return [key, ...args].filter((k) => hashes.delete(k) || sets.delete(k) || counters.delete(k)).length
      case 'incr':
        counters.set(key, (counters.get(key) ?? 0) + 1)
        return counters.get(key)
      case 'expire':
        return 1
      case 'sadd':
        return args.filter((m) => !set(key).has(m) && set(key).add(m)).length
      case 'srem':
        return args.filter((m) => sets.get(key)?.delete(m)).length
      case 'scard':
        return sets.get(key)?.size ?? 0
      default:
        throw new Error(`fake Upstash does not know ${name}`)
    }
  }
  const b64 = (v: unknown): unknown => (typeof v === 'string' ? Buffer.from(v).toString('base64') : Array.isArray(v) ? v.map(b64) : v)
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit) => {
    const path = new URL(String(input)).pathname
    const body = JSON.parse(String(init.body))
    if (path.endsWith('/pipeline') || path.endsWith('/multi-exec')) return Response.json(body.map((c: unknown[]) => ({ result: b64(run(c)) })))
    return Response.json({ result: b64(run(body)) })
  })
  return new Redis({ url: 'https://fake.upstash.io', token: 'token', enableTelemetry: false })
}

afterEach(() => vi.unstubAllGlobals())

const stores = {
  memory: () => memoryStore(),
  redis: () => redisStore(fakeUpstash()),
}

for (const [name, makeStore] of Object.entries(stores)) {
  describe(`feedback board (${name} store)`, () => {
    const setup = () => ({ store: makeStore(), adminToken: ADMIN, salt: 'salt', now: () => Date.parse('2026-09-18T12:00:00Z') })

    it('posts, lists, and counts one vote per browser', async () => {
      const d = setup()
      const res = await createFeedback(req('POST', { kind: 'idea', title: '  A map of Paul’s journeys ', body: 'Please.', name: 'Ruth', voter: VOTER_A }), d)
      expect(res.status).toBe(201)
      const { item } = await res.json()
      expect(item).toMatchObject({ id: '1', kind: 'idea', title: 'A map of Paul’s journeys', name: 'Ruth', status: 'open', hidden: false, votes: 1 })

      const vote = (voter: string, up = true) => voteFeedback(req('POST', { id: item.id, voter, up }), d).then((r) => r.json())
      expect((await vote(VOTER_B)).votes).toBe(2)
      expect((await vote(VOTER_B)).votes).toBe(2)
      expect((await vote(VOTER_A, false)).votes).toBe(1)

      await createFeedback(req('POST', { kind: 'nonsense', title: 'Second thought', voter: VOTER_B }), d)
      const list = await (await listFeedback(req('GET'), d)).json()
      expect(list.admin).toBe(false)
      expect(list.items.map((i: { title: string; votes: number; kind: string }) => [i.title, i.votes, i.kind])).toEqual([
        ['A map of Paul’s journeys', 1, 'idea'],
        ['Second thought', 1, 'idea'],
      ])
    })

    it('lets the owner hide, reply, set a status, and delete', async () => {
      const d = setup()
      const { item } = await (await createFeedback(req('POST', { title: 'Spam spam spam', voter: VOTER_A }), d)).json()
      const auth = { authorization: `Bearer ${ADMIN}` }

      const hidden = await moderateFeedback(req('POST', { id: item.id, hidden: true, status: 'declined', reply: 'Not for here.' }, auth), d)
      expect((await hidden.json()).item).toMatchObject({ hidden: true, status: 'declined', reply: 'Not for here.' })
      expect((await (await listFeedback(req('GET'), d)).json()).items).toHaveLength(0)
      const asOwner = await (await listFeedback(req('GET', undefined, auth), d)).json()
      expect(asOwner).toMatchObject({ admin: true, items: [{ id: item.id, hidden: true }] })
      expect((await voteFeedback(req('POST', { id: item.id, voter: VOTER_B }), d)).status).toBe(404)

      expect((await moderateFeedback(req('POST', { id: item.id, status: 'maybe' }, auth), d)).status).toBe(400)
      expect((await moderateFeedback(req('POST', { id: item.id, delete: true }, auth), d)).status).toBe(200)
      expect((await (await listFeedback(req('GET', undefined, auth), d)).json()).items).toHaveLength(0)
    })

    it('refuses a wrong admin key, and slows down guessing', async () => {
      const d = setup()
      await createFeedback(req('POST', { title: 'Something', voter: VOTER_A }), d)
      const wrong = () => moderateFeedback(req('POST', { id: '1', hidden: true }, { authorization: 'Bearer guess' }), d)
      for (let i = 0; i < RATES.adminFail; i++) expect((await wrong()).status).toBe(401)
      expect((await wrong()).status).toBe(429)
      expect((await listFeedback(req('GET', undefined, { authorization: 'Bearer guess' }), d)).status).toBe(429)
      expect((await moderateFeedback(req('POST', { id: '1' }, { authorization: 'Bearer x' }), { ...d, adminToken: '' })).status).toBe(503)
    })

    it('limits posts per address per hour', async () => {
      const d = setup()
      for (let i = 0; i < RATES.post; i++) expect((await createFeedback(req('POST', { title: `Post ${i}` }), d)).status).toBe(201)
      expect((await createFeedback(req('POST', { title: 'One more' }), d)).status).toBe(429)
      expect((await createFeedback(req('POST', { title: 'From elsewhere' }, { 'x-forwarded-for': '198.51.100.2' }), d)).status).toBe(201)
    })

    it('rejects bad input and quietly drops bots', async () => {
      const d = setup()
      expect((await createFeedback(req('POST', { title: 'Hi' }), d)).status).toBe(400)
      expect((await createFeedback(req('POST', { title: 'A real title' }, { 'content-type': 'text/plain' }), d)).status).toBe(415)
      expect((await createFeedback(new Request('http://localhost/api/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' }), d)).status).toBe(400)
      expect((await voteFeedback(req('POST', { id: '1', voter: 'short' }), d)).status).toBe(400)
      const bot = await createFeedback(req('POST', { title: 'Cheap pills', website: 'http://spam.example' }), d)
      expect(bot.status).toBe(201)
      expect((await (await listFeedback(req('GET'), d)).json()).items).toHaveLength(0)
    })
  })
}

describe('feedback without a database', () => {
  it('says so instead of pretending to save', async () => {
    const d = { store: null, adminToken: '', salt: '', now: Date.now }
    expect((await listFeedback(req('GET'), d)).status).toBe(503)
    expect((await createFeedback(req('POST', { title: 'Hello there' }), d)).status).toBe(503)
  })
})

describe('clean', () => {
  it('trims, strips control characters, and caps length by character', () => {
    expect(clean('  two\t\twords  ', 50)).toBe('two words')
    expect(clean('line one  \r\n\r\n\r\n\r\nline two ', 50, true)).toBe('line one\n\nline two')
    expect(clean('🙂🙂🙂', 2)).toBe('🙂🙂')
    expect(clean(42, 10)).toBe('')
  })
})
