import MiniSearch from 'minisearch'
import { escapeRegExp } from '@/lib/format'
import { loadEvents, loadPeopleIndex, loadPlacesIndex, loadStudiesIndex, loadTopicsIndex } from './loaders'
import type { Bible } from './types'

export type EntityType = 'study' | 'person' | 'place' | 'topic' | 'event' | 'book'

export interface EntityDoc {
  id: string
  type: EntityType
  key: string
  title: string
  aka: string
  sub: string
  n: number
}

export interface EntityHit extends EntityDoc {
  score: number
}

export const TYPE_LABELS: Record<EntityType, string> = {
  study: 'Studies',
  person: 'People',
  place: 'Places',
  topic: 'Topics',
  event: 'Events',
  book: 'Books',
}

export const TYPE_ORDER: EntityType[] = ['study', 'person', 'place', 'topic', 'event', 'book']

export function entityHref(type: EntityType, key: string): string {
  return `/${type}/${encodeURIComponent(key)}`
}

export async function buildSearchIndex(): Promise<MiniSearch<EntityDoc>> {
  const [people, places, topics, events, studies, books] = await Promise.all([
    loadPeopleIndex(),
    loadPlacesIndex(),
    loadTopicsIndex(),
    loadEvents(),
    loadStudiesIndex(),
    import('@/lib/canon').then((m) => m.BOOKS),
  ])
  const docs: EntityDoc[] = []
  for (const s of studies) docs.push({ id: `study:${s.id}`, type: 'study', key: s.id, title: s.title, aka: s.tags.join(' '), sub: s.subtitle ?? `${s.refCount} references`, n: s.refCount })
  for (const p of people)
    docs.push({
      id: `person:${p.id}`,
      type: 'person',
      key: p.id,
      title: p.title,
      aka: p.aka?.join(' ') ?? '',
      sub: [p.meaning ? `“${p.meaning}”` : undefined, `${p.verseCount.toLocaleString()} verse${p.verseCount === 1 ? '' : 's'}`].filter(Boolean).join(' · '),
      n: p.verseCount,
    })
  for (const p of places)
    docs.push({
      id: `place:${p.id}`,
      type: 'place',
      key: p.id,
      title: p.name,
      aka: p.aliases?.join(' ') ?? '',
      sub: [p.meaning ? `“${p.meaning}”` : undefined, p.type, `${p.verseCount.toLocaleString()} verse${p.verseCount === 1 ? '' : 's'}`].filter(Boolean).join(' · '),
      n: p.verseCount,
    })
  for (const t of topics)
    docs.push({
      id: `topic:${t.id}`,
      type: 'topic',
      key: t.id,
      title: t.title,
      aka: '',
      sub: `${t.source === 'nave' ? "Nave's" : "Torrey's"} · ${t.verses.toLocaleString()} verses`,
      n: t.verses,
    })
  for (const e of events) docs.push({ id: `event:${e.id}`, type: 'event', key: e.id, title: e.title, aka: '', sub: e.year === null ? '' : e.year < 0 ? `${-e.year} BC` : `AD ${e.year}`, n: e.verses.length })
  for (const b of books) docs.push({ id: `book:${b.osis}`, type: 'book', key: b.osis, title: b.name, aka: `${b.short} ${b.aliases.join(' ')}`, sub: b.division, n: 1 })

  const ms = new MiniSearch<EntityDoc>({
    fields: ['title', 'aka'],
    storeFields: ['type', 'key', 'title', 'aka', 'sub', 'n'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.15,
      combineWith: 'AND',
      boost: { title: 3 },
      boostDocument: (_id, _term, stored) => 1 + Math.log10(1 + ((stored?.n as number) ?? 0)) * 0.12,
    },
  })
  ms.addAll(docs)
  return ms
}

export function searchEntities(index: MiniSearch<EntityDoc>, query: string, perType = 6): Map<EntityType, EntityHit[]> {
  const q = query.trim()
  const out = new Map<EntityType, EntityHit[]>()
  if (!q) return out
  const hits = index.search(q) as unknown as (EntityDoc & { score: number })[]
  for (const h of hits) {
    const list = out.get(h.type) ?? []
    if (list.length >= perType) continue
    list.push(h)
    out.set(h.type, list)
  }
  return out
}

const lowerCache = new WeakMap<Bible, string[]>()
function lowerVerses(bible: Bible): string[] {
  let l = lowerCache.get(bible)
  if (!l) {
    l = bible.verses.map((v) => v.toLowerCase())
    lowerCache.set(bible, l)
  }
  return l
}

export interface VerseQuery {
  terms: string[]
  phrase: boolean
}

export function parseVerseQuery(query: string): VerseQuery {
  const q = query.trim().toLowerCase()
  const m = /^"(.+)"$/.exec(q)
  if (m) return { terms: [m[1].trim()], phrase: true }
  return { terms: q.split(/\s+/).filter((t) => t.length > 0), phrase: false }
}

export function termRegex(term: string, flags = ''): RegExp {
  return new RegExp(`(?<![a-z])${escapeRegExp(term)}`, flags)
}

/** Every verse whose text contains all terms (as word prefixes) or the quoted phrase. */
export function searchVerses(bible: Bible, query: string, limit = Infinity): number[] {
  const { terms } = parseVerseQuery(query)
  if (!terms.length || terms.every((t) => t.length < 2)) return []
  const regs = terms.map((t) => termRegex(t))
  const lv = lowerVerses(bible)
  const out: number[] = []
  for (let o = 0; o < lv.length; o++) {
    const t = lv[o]
    if (!t) continue
    let ok = true
    for (const r of regs) {
      if (!r.test(t)) {
        ok = false
        break
      }
    }
    if (ok) {
      out.push(o)
      if (out.length >= limit) break
    }
  }
  return out
}
