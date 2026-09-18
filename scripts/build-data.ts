/**
 * Compiles every raw source in data/raw into the static JSON the app serves from
 * public/data. Deterministic: the same inputs always produce the same files.
 *
 *   pnpm data:build
 */
import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import { BOOKS, Canon, findBookMeta } from '../src/lib/canon'
import { countVerses, mergeRanges, parseRefs, type Range } from '../src/lib/refs'
import { parseUsfm, type UsfmBook } from './lib/usfm'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data', 'raw')
const OUT = path.join(ROOT, 'public', 'data')
const STUDIES_DIR = path.join(ROOT, 'data', 'studies')

const t0 = Date.now()
const log = (...a: unknown[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)
const warn = (...a: unknown[]) => console.warn('  !', ...a)
const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T
const readText = (p: string) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '')
const readJsonl = <T>(p: string): T[] =>
  readText(p)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T)

let bytesWritten = 0
let filesWritten = 0
function writeJson(rel: string, data: unknown) {
  const p = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const s = JSON.stringify(data)
  fs.writeFileSync(p, s)
  bytesWritten += s.length
  filesWritten++
}

type Rec = { id: string; fields: Record<string, unknown> }
const str = (f: Record<string, unknown>, k: string): string | undefined => {
  const v = f[k]
  return typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined
}
const num = (f: Record<string, unknown>, k: string): number | undefined => {
  const v = f[k]
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  return undefined
}
const arr = (f: Record<string, unknown>, k: string): string[] => {
  const v = f[k]
  return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : []
}
const uniq = <T>(xs: T[]) => [...new Set(xs)]
const cleanDict = (t?: string) => t?.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\uFFFD/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/[ \t]+/g, ' ').trim()
const shardOf = (id: string) => (/^[a-z]/.test(id) ? id[0] : '_')
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const SMALL = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'from', 'as'])
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.replace(/^[a-z]/, (ch) => ch.toUpperCase())))
    .join('')
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------------------
// 1. The verse grid, from Theographic's verse table.
// ---------------------------------------------------------------------------
const tVerses = readJson<Rec[]>(path.join(RAW, 'theographic', 'verses.json'))
const maxVerse = new Map<string, number>()
const maxChapter = new Map<number, number>()
for (const r of tVerses) {
  const id = str(r.fields, 'verseID')!
  const b = +id.slice(0, 2)
  const c = +id.slice(2, 5)
  const v = +id.slice(5, 8)
  maxVerse.set(`${b}:${c}`, Math.max(maxVerse.get(`${b}:${c}`) ?? 0, v))
  maxChapter.set(b, Math.max(maxChapter.get(b) ?? 0, c))
}
const canon = new Canon(
  BOOKS.map((b) => Array.from({ length: maxChapter.get(b.n) ?? 0 }, (_, i) => maxVerse.get(`${b.n}:${i + 1}`) ?? 0)),
)
if (canon.total !== tVerses.length) throw new Error(`grid mismatch: ${canon.total} vs ${tVerses.length} verses`)
log(`canon: ${canon.total} verses in ${canon.books.length} books`)

const recToOrd = new Map<string, number>()
for (const r of tVerses) {
  const id = str(r.fields, 'verseID')!
  const o = canon.ordinal(+id.slice(0, 2), +id.slice(2, 5), +id.slice(5, 8))
  if (o < 0) throw new Error(`bad verseID ${id}`)
  recToOrd.set(r.id, o)
}
const ordsOf = (f: Record<string, unknown>, k: string): number[] =>
  uniq(arr(f, k).map((id) => recToOrd.get(id)).filter((o): o is number => o !== undefined)).sort((a, b) => a - b)

const bookExtras = new Map<string, { writers: string[]; peopleCount: number; placeCount: number }>()
for (const r of readJson<Rec[]>(path.join(RAW, 'theographic', 'books.json'))) {
  const osis = str(r.fields, 'osisName')
  if (!osis) continue
  bookExtras.set(osis, { writers: arr(r.fields, 'writers'), peopleCount: num(r.fields, 'peopleCount') ?? 0, placeCount: num(r.fields, 'placeCount') ?? 0 })
}
writeJson('books.json', {
  total: canon.total,
  books: canon.books.map((b) => ({
    n: b.n,
    osis: b.osis,
    usfm: b.usfm,
    name: b.name,
    short: b.short,
    testament: b.testament,
    division: b.division,
    chapters: b.chapters,
    writers: bookExtras.get(b.osis)?.writers ?? [],
    peopleCount: bookExtras.get(b.osis)?.peopleCount ?? 0,
    placeCount: bookExtras.get(b.osis)?.placeCount ?? 0,
  })),
})

// ---------------------------------------------------------------------------
// 2. Years: one (approximate, traditional) year per verse.
// ---------------------------------------------------------------------------
const years: (number | null)[] = new Array(canon.total).fill(null)
for (const r of tVerses) {
  const y = num(r.fields, 'yearNum')
  if (y !== undefined) years[recToOrd.get(r.id)!] = y
}
writeJson('years.json', years)
log(`years: ${years.filter((y) => y !== null).length} verses dated`)

// ---------------------------------------------------------------------------
// 3. People, places, events (Theographic).
// ---------------------------------------------------------------------------
const tPeople = readJson<Rec[]>(path.join(RAW, 'theographic', 'people.json'))
const tPlaces = readJson<Rec[]>(path.join(RAW, 'theographic', 'places.json'))
const tEvents = readJson<Rec[]>(path.join(RAW, 'theographic', 'events.json'))

const personId = new Map<string, string>()
for (const r of tPeople) {
  const slug = str(r.fields, 'slug') ?? str(r.fields, 'personLookup')
  if (slug) personId.set(r.id, slug)
}
const placeId = new Map<string, string>()
for (const r of tPlaces) {
  if (arr(r.fields, 'duplicate_of').length) continue
  const slug = str(r.fields, 'slug') ?? str(r.fields, 'placeLookup')
  if (slug) placeId.set(r.id, slug)
}
const eventId = new Map<string, string>()
for (const r of tEvents) {
  const n = num(r.fields, 'eventID')
  if (n !== undefined) eventId.set(r.id, `e${n}`)
}
const mapIds = (f: Record<string, unknown>, k: string, m: Map<string, string>) =>
  uniq(arr(f, k).map((id) => m.get(id)).filter((x): x is string => !!x))

const splitList = (s?: string) =>
  s
    ? s
        .split(/[,;]/)
        .map((x) => x.trim())
        .filter(Boolean)
    : []

interface PersonFull {
  id: string
  name: string
  title: string
  gender?: string
  birth?: number
  death?: number
  min?: number
  max?: number
  aka: string[]
  father: string[]
  mother: string[]
  partners: string[]
  children: string[]
  siblings: string[]
  birthPlace: string[]
  deathPlace: string[]
  events: string[]
  verses: number[]
  verseCount: number
  dict?: string
  status?: string
}
const people: PersonFull[] = []
for (const r of tPeople) {
  const id = personId.get(r.id)
  if (!id) continue
  const f = r.fields
  const name = str(f, 'name') ?? str(f, 'displayTitle') ?? id
  const verses = ordsOf(f, 'verses')
  people.push({
    id,
    name,
    title: str(f, 'displayTitle') ?? name,
    gender: str(f, 'gender'),
    birth: num(f, 'birthYear'),
    death: num(f, 'deathYear'),
    min: num(f, 'minYear'),
    max: num(f, 'maxYear'),
    aka: splitList(str(f, 'alsoCalled')),
    father: mapIds(f, 'father', personId),
    mother: mapIds(f, 'mother', personId),
    partners: mapIds(f, 'partners', personId),
    children: mapIds(f, 'children', personId),
    siblings: uniq([
      ...mapIds(f, 'siblings', personId),
      ...mapIds(f, 'halfSiblingsSameFather', personId),
      ...mapIds(f, 'halfSiblingsSameMother', personId),
    ]),
    birthPlace: mapIds(f, 'birthPlace', placeId),
    deathPlace: mapIds(f, 'deathPlace', placeId),
    events: mapIds(f, 'events', eventId),
    verses,
    verseCount: verses.length,
    dict: cleanDict(str(f, 'dictText') ?? str(f, 'dictionaryText')),
    status: str(f, 'status'),
  })
}
people.sort((a, b) => a.id.localeCompare(b.id))
{
  const shards = new Map<string, Record<string, PersonFull>>()
  for (const p of people) {
    const s = shardOf(p.id)
    if (!shards.has(s)) shards.set(s, {})
    shards.get(s)![p.id] = p
  }
  for (const [s, obj] of shards) writeJson(`people/${s}.json`, obj)
  writeJson(
    'people/index.json',
    people.map((p) => ({
      id: p.id,
      title: p.title,
      gender: p.gender,
      verseCount: p.verseCount,
      birth: p.birth,
      death: p.death,
      aka: p.aka.length ? p.aka : undefined,
      shard: shardOf(p.id),
    })),
  )
}
log(`people: ${people.length}`)

interface PlaceFull {
  id: string
  name: string
  kjvName?: string
  esvName?: string
  lat?: number
  lon?: number
  type?: string
  subType?: string
  precision?: string
  aliases: string[]
  events: string[]
  peopleBorn: string[]
  peopleDied: string[]
  verses: number[]
  verseCount: number
  dict?: string
  comment?: string
}
const places: PlaceFull[] = []
for (const r of tPlaces) {
  const id = placeId.get(r.id)
  if (!id) continue
  const f = r.fields
  const verses = ordsOf(f, 'verses')
  const lat = num(f, 'latitude') ?? num(f, 'openBibleLat') ?? num(f, 'recogitoLat')
  const lon = num(f, 'longitude') ?? num(f, 'openBibleLong') ?? num(f, 'recogitoLon')
  places.push({
    id,
    name: str(f, 'displayTitle') ?? str(f, 'kjvName') ?? str(f, 'esvName') ?? id,
    kjvName: str(f, 'kjvName'),
    esvName: str(f, 'esvName'),
    lat,
    lon,
    type: str(f, 'featureType'),
    subType: str(f, 'featureSubType'),
    precision: str(f, 'precision'),
    aliases: splitList(str(f, 'aliases')),
    events: mapIds(f, 'eventsHere', eventId),
    peopleBorn: mapIds(f, 'peopleBorn', personId),
    peopleDied: mapIds(f, 'peopleDied', personId),
    verses,
    verseCount: verses.length,
    dict: cleanDict(str(f, 'dictText') ?? str(f, 'dictionaryText')),
    comment: str(f, 'comment'),
  })
}
places.sort((a, b) => a.id.localeCompare(b.id))
{
  const shards = new Map<string, Record<string, PlaceFull>>()
  for (const p of places) {
    const s = shardOf(p.id)
    if (!shards.has(s)) shards.set(s, {})
    shards.get(s)![p.id] = p
  }
  for (const [s, obj] of shards) writeJson(`places/${s}.json`, obj)
  writeJson(
    'places/index.json',
    places.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      verseCount: p.verseCount,
      lat: p.lat,
      lon: p.lon,
      aliases: p.aliases.length ? p.aliases : undefined,
      shard: shardOf(p.id),
    })),
  )
}
log(`places: ${places.length} (${places.filter((p) => p.lat !== undefined).length} geocoded)`)

interface EventFull {
  id: string
  title: string
  year: number | null
  date?: string
  duration?: string
  participants: string[]
  locations: string[]
  verses: number[]
  predecessor: string[]
  partOf: string[]
  lag?: string
  lagType?: string
  sort: number
  notes?: string
}
const events: EventFull[] = []
for (const r of tEvents) {
  const id = eventId.get(r.id)
  if (!id) continue
  const f = r.fields
  const date = str(f, 'startDate')
  const ym = date ? /^(-?\d{1,4})/.exec(date) : null
  events.push({
    id,
    title: str(f, 'title') ?? id,
    year: ym ? parseInt(ym[1], 10) : null,
    date,
    duration: str(f, 'duration'),
    participants: mapIds(f, 'participants', personId),
    locations: mapIds(f, 'locations', placeId),
    verses: ordsOf(f, 'verses'),
    predecessor: mapIds(f, 'predecessor', eventId),
    partOf: mapIds(f, 'partOf', eventId),
    lag: str(f, 'lag'),
    lagType: str(f, 'lagType'),
    sort: num(f, 'sortKey') ?? num(f, 'verseSort') ?? 0,
    notes: str(f, 'notes'),
  })
}
events.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
writeJson('events.json', events)
log(`events: ${events.length}`)

// Verse -> people/places, per book.
{
  const perBook = new Map<number, Record<number, [string[], string[]]>>()
  let n = 0
  for (const r of tVerses) {
    const p = mapIds(r.fields, 'people', personId)
    const l = mapIds(r.fields, 'places', placeId)
    if (!p.length && !l.length) continue
    const o = recToOrd.get(r.id)!
    const b = canon.locate(o).b
    if (!perBook.has(b)) perBook.set(b, {})
    perBook.get(b)![o] = [p, l]
    n++
  }
  for (const [b, obj] of perBook) writeJson(`entities/${canon.book(b).osis}.json`, obj)
  log(`verse entities: ${n} verses linked`)
}

// ---------------------------------------------------------------------------
// 4. Cross references (OpenBible.info), grouped by the source verse's book.
// ---------------------------------------------------------------------------
{
  const lines = readText(path.join(RAW, 'openbible', 'cross_references.txt')).split('\n')
  const perBook = new Map<number, Record<number, [number, number, number][]>>()
  let kept = 0
  let dropped = 0
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const [from, to, votesRaw] = line.split('\t')
    const votes = parseInt(votesRaw, 10)
    const fromR = parseRefs(from, canon).ranges
    const toR = parseRefs(to, canon).ranges
    if (!fromR.length || !toR.length || Number.isNaN(votes)) {
      dropped++
      continue
    }
    const fromOrd = fromR[0][0]
    const b = canon.locate(fromOrd).b
    if (!perBook.has(b)) perBook.set(b, {})
    const book = perBook.get(b)!
    ;(book[fromOrd] ??= []).push([toR[0][0], toR[0][1], votes])
    kept++
  }
  for (const [b, obj] of perBook) {
    for (const k of Object.keys(obj)) obj[+k].sort((x, y) => y[2] - x[2] || x[0] - y[0])
    writeJson(`xrefs/${canon.book(b).osis}.json`, obj)
  }
  log(`cross references: ${kept} kept, ${dropped} dropped`)
}

// ---------------------------------------------------------------------------
// 5. Topical index (Nave + Torrey).
// ---------------------------------------------------------------------------
{
  interface TopicRow { id: string; source: string; sourceTopic: string; sourceTopicSlug: string; seeAlso: string[] }
  interface EntryRow { id: string; topicId: string; entryIndex: number; rawText: string }
  interface AssertionRow {
    entryId: string
    sourceStatus: string
    book: string
    chapterStart: number
    verseStart: number | null
    chapterEnd: number
    verseEnd: number | null
    scope: string
  }
  interface TopicOut { id: string; title: string; source: string; seeAlso: string[]; entries: { text: string; refs: Range[] }[] }
  const topicsOut: TopicOut[] = []
  let bad = 0
  for (const source of ['nave', 'torrey']) {
    const dir = path.join(RAW, 'topical', source)
    const topics = readJsonl<TopicRow>(path.join(dir, 'topics.jsonl'))
    const entries = readJsonl<EntryRow>(path.join(dir, 'entries.jsonl'))
    const assertions = readJsonl<AssertionRow>(path.join(dir, 'assertions.jsonl'))
    const refsByEntry = new Map<string, Range[]>()
    for (const a of assertions) {
      if (a.sourceStatus.includes('invalid')) continue
      const book = canon.find(a.book)
      if (!book) {
        bad++
        continue
      }
      let s: number
      let e: number
      if (a.scope === 'chapter' || a.verseStart === null) {
        if (a.chapterStart < 1 || a.chapterEnd > book.chapters.length) {
          bad++
          continue
        }
        s = canon.chapterStart(book.n, a.chapterStart)
        e = canon.chapterEnd(book.n, a.chapterEnd)
      } else {
        s = canon.ordinal(book.n, a.chapterStart, a.verseStart)
        const ve = a.verseEnd ?? a.verseStart
        e = canon.ordinal(book.n, a.chapterEnd, Math.min(ve, book.chapters[a.chapterEnd - 1] ?? ve))
        if (s < 0 || e < 0) {
          bad++
          continue
        }
      }
      if (e < s) [s, e] = [e, s]
      ;(refsByEntry.get(a.entryId) ?? refsByEntry.set(a.entryId, []).get(a.entryId)!).push([s, e])
    }
    const entriesByTopic = new Map<string, EntryRow[]>()
    for (const en of entries) (entriesByTopic.get(en.topicId) ?? entriesByTopic.set(en.topicId, []).get(en.topicId)!).push(en)
    for (const t of topics) {
      const ens = (entriesByTopic.get(t.id) ?? []).sort((a, b) => a.entryIndex - b.entryIndex)
      topicsOut.push({
        id: t.id,
        title: titleCase(t.sourceTopic),
        source,
        seeAlso: (t.seeAlso ?? []).map(titleCase),
        entries: ens.map((en) => ({ text: en.rawText.replace(/^[.\-–—·]+\s*/, ''), refs: refsByEntry.get(en.id) ?? [] })),
      })
    }
  }
  const shards = new Map<string, Record<string, TopicOut>>()
  for (const t of topicsOut) {
    const s = shardOf(t.id.split(':')[1] ?? t.id)
    if (!shards.has(s)) shards.set(s, {})
    shards.get(s)![t.id] = t
  }
  for (const [s, obj] of shards) writeJson(`topics/${s}.json`, obj)
  writeJson(
    'topics/index.json',
    topicsOut.map((t) => ({
      id: t.id,
      title: t.title,
      source: t.source,
      entries: t.entries.length,
      verses: countVerses(mergeRanges(t.entries.flatMap((e) => e.refs))),
      shard: shardOf(t.id.split(':')[1] ?? t.id),
    })),
  )
  log(`topics: ${topicsOut.length} (${bad} unresolvable references skipped)`)
}

// ---------------------------------------------------------------------------
// 6. Bibles.
// ---------------------------------------------------------------------------
interface BibleJson {
  id: string
  name: string
  abbrev: string
  year?: string
  license: string
  attribution: string
  verses: string[]
  wj?: Record<number, [number, number][]>
  headings?: Record<number, string>
}
const bsbWj = new Map<number, [number, number][]>()

function parseUsfmDir(dir: string): UsfmBook[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.usfm$/i.test(f))
    .map((f) => parseUsfm(readText(path.join(dir, f))))
}

/** The BSB's own USFM export carries a few converter artifacts; the plain-text edition is clean. */
const cleanBsb = (t: string) => t.replace(/\[’’\]/g, '').replace(/\bvvv\s*/g, '').replace(/\s*—\s*/g, '—').replace(/\s+/g, ' ').trim()

function bibleFromUsfm(meta: Omit<BibleJson, 'verses'>, books: UsfmBook[], plainText?: Map<number, string>): BibleJson {
  const verses: string[] = new Array(canon.total).fill('')
  const wj: Record<number, [number, number][]> = {}
  const headings: Record<number, string> = {}
  let skipped = 0
  let lostSpans = 0
  let replaced = 0
  for (const bk of books) {
    const bm = findBookMeta(bk.code)
    if (!bm || bm.usfm !== bk.code.toUpperCase()) continue
    for (const v of bk.verses) {
      const o = canon.ordinal(bm.n, v.c, v.v)
      if (o < 0) {
        skipped++
        continue
      }
      const usfmText = plainText ? cleanBsb(v.text) : v.text
      const plain = plainText?.get(o)
      const text = plain !== undefined && plain !== usfmText ? (replaced++, plain) : usfmText
      verses[o] = text
      if (v.wj.length) {
        // Re-locate each quoted span inside the final text.
        const spans: [number, number][] = []
        let cursor = 0
        for (const [a, b] of v.wj) {
          const piece = (plainText ? cleanBsb(v.text.slice(a, b)) : v.text.slice(a, b)).trim()
          if (!piece) continue
          const idx = text.indexOf(piece, cursor)
          if (idx < 0) {
            lostSpans++
            continue
          }
          spans.push([idx, idx + piece.length])
          cursor = idx + piece.length
        }
        if (spans.length) wj[o] = spans
      }
    }
    for (const [key, h] of bk.headings) {
      const [c, v] = key.split(':').map(Number)
      const o = canon.ordinal(bm.n, c, v)
      if (o >= 0) headings[o] = h
    }
  }
  if (skipped) warn(`${meta.id}: ${skipped} verses outside the grid were skipped`)
  if (replaced) log(`${meta.id}: ${replaced} verses taken from the plain-text edition where the USFM differed`)
  if (lostSpans) warn(`${meta.id}: ${lostSpans} words-of-Jesus spans could not be re-located`)
  const filled = verses.filter(Boolean).length
  log(`${meta.id}: ${filled} verses, ${Object.keys(wj).length} with words of Jesus, ${Object.keys(headings).length} headings`)
  return { ...meta, verses, wj, headings }
}

function loadBsbPlainText(): Map<number, string> {
  const out = new Map<number, string>()
  for (const line of readText(path.join(RAW, 'bsb', 'bsb.txt')).split(/\r?\n/)) {
    const m = /^(.+?) (\d+):(\d+)\t(.*)$/.exec(line)
    if (!m) continue
    const book = canon.find(m[1])
    if (!book) continue
    const o = canon.ordinal(book.n, +m[2], +m[3])
    if (o >= 0) out.set(o, m[4].replace(/\s+/g, ' ').trim())
  }
  return out
}

{
  const plain = loadBsbPlainText()
  log(`bsb plain text: ${plain.size} verses`)
  const bsb = bibleFromUsfm(
    {
      id: 'bsb',
      name: 'Berean Standard Bible',
      abbrev: 'BSB',
      year: '2023',
      license: 'Public domain',
      attribution:
        'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, unfoldingWord, Bible Aquifer, OpenBible.com, and the Berean Bible Translation Committee. This text of God\'s Word has been dedicated to the public domain.',
    },
    parseUsfmDir(path.join(RAW, 'bsb', 'usfm', 'bsb_usfm')),
    plain,
  )
  let mismatched = 0
  for (const [o, t] of plain) if (bsb.verses[o] !== t) mismatched++
  log(`bsb check vs bsb.txt: ${plain.size - mismatched} identical, ${mismatched} different`)
  for (const [k, spans] of Object.entries(bsb.wj ?? {})) bsbWj.set(+k, spans)
  writeJson('bibles/bsb.json', bsb)

  const web = bibleFromUsfm(
    {
      id: 'web',
      name: 'World English Bible',
      abbrev: 'WEB',
      year: '2020',
      license: 'Public domain',
      attribution: 'The World English Bible (WEB) is a public domain modern English translation published by eBible.org.',
    },
    parseUsfmDir(path.join(RAW, 'web', 'usfm')),
  )
  writeJson('bibles/web.json', web)

  interface ScrollmapperJson {
    translation: string
    books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[]
  }
  const fromScrollmapper = (meta: Omit<BibleJson, 'verses'>, file: string): BibleJson => {
    const data = readJson<ScrollmapperJson>(path.join(RAW, 'scrollmapper', file))
    const verses: string[] = new Array(canon.total).fill('')
    let skipped = 0
    for (const b of data.books) {
      const book = canon.find(b.name)
      if (!book) {
        warn(`${meta.id}: unknown book ${b.name}`)
        continue
      }
      for (const ch of b.chapters)
        for (const v of ch.verses) {
          const o = canon.ordinal(book.n, ch.chapter, v.verse)
          if (o < 0) {
            skipped++
            continue
          }
          verses[o] = v.text.replace(/\s+/g, ' ').trim()
        }
    }
    if (skipped) warn(`${meta.id}: ${skipped} verses outside the grid were skipped`)
    log(`${meta.id}: ${verses.filter(Boolean).length} verses`)
    return { ...meta, verses }
  }
  writeJson(
    'bibles/kjv.json',
    fromScrollmapper(
      { id: 'kjv', name: 'King James Version', abbrev: 'KJV', year: '1769', license: 'Public domain', attribution: 'King James Version (1769 text), public domain.' },
      'KJV.json',
    ),
  )
  writeJson(
    'bibles/asv.json',
    fromScrollmapper(
      { id: 'asv', name: 'American Standard Version', abbrev: 'ASV', year: '1901', license: 'Public domain', attribution: 'American Standard Version (1901), public domain.' },
      'ASV.json',
    ),
  )
  writeJson(
    'bibles/ylt.json',
    fromScrollmapper(
      { id: 'ylt', name: "Young's Literal Translation", abbrev: 'YLT', year: '1898', license: 'Public domain', attribution: "Young's Literal Translation (1898), public domain." },
      'YLT.json',
    ),
  )
  writeJson('bibles/index.json', [
    { id: 'bsb', name: 'Berean Standard Bible', abbrev: 'BSB', redLetter: true, headings: true },
    { id: 'web', name: 'World English Bible', abbrev: 'WEB', redLetter: true, headings: true },
    { id: 'kjv', name: 'King James Version', abbrev: 'KJV', redLetter: false, headings: false },
    { id: 'asv', name: 'American Standard Version', abbrev: 'ASV', redLetter: false, headings: false },
    { id: 'ylt', name: "Young's Literal Translation", abbrev: 'YLT', redLetter: false, headings: false },
  ])
}

// ---------------------------------------------------------------------------
// 7. Studies: hand-authored YAML -> resolved JSON, weighted by who is speaking.
// ---------------------------------------------------------------------------
interface StudyLinkYaml {
  to: string
  topic?: string
  note?: string
  category?: string
  label?: string
}
interface StudyRefYaml {
  ref: string
  note?: string
  label?: string
  weight?: number
  /** connection studies: the passage this reference points to */
  to?: string
  category?: string
  /** further passages this reference connects to, each with the theme of the connection */
  links?: StudyLinkYaml[]
}
interface StudyGroupYaml {
  id?: string
  title: string
  note?: string
  weight?: number
  refs: (string | StudyRefYaml)[]
}
interface StudyViewYaml {
  id?: string
  title: string
  note?: string
  groups?: StudyGroupYaml[]
  /** Derive the groups from every reference in the authored views. */
  auto?: 'book' | 'testament' | 'jesus' | 'category'
}
interface StudyCategoryYaml {
  title: string
  note?: string
}
interface StudyYaml {
  id: string
  title: string
  subtitle?: string
  summary?: string
  tags?: string[]
  kind?: string
  chart?: string
  categories?: Record<string, StudyCategoryYaml>
  views: StudyViewYaml[]
}
interface StudyLink {
  ranges: Range[]
  label: string
  topic?: string
  note?: string
  category?: string
  jesus: boolean
}
interface StudyRef {
  label: string
  ranges: Range[]
  verses: number
  weight: number
  jesus: boolean
  note?: string
  to?: Range[]
  toLabel?: string
  category?: string
  links?: StudyLink[]
}
interface StudyGroup {
  id: string
  title: string
  note?: string
  refs: StudyRef[]
  weight: number
  verses: number
}
interface StudyView {
  id: string
  title: string
  note?: string
  groups: StudyGroup[]
}
interface StudyJson {
  id: string
  title: string
  subtitle?: string
  summary?: string
  tags: string[]
  kind?: string
  chart?: string
  categories?: { id: string; title: string; note?: string }[]
  views: StudyView[]
  ranges: Range[]
  refCount: number
  verseCount: number
}

const jesusSpeaksIn = (ranges: Range[]): boolean => {
  for (const [s, e] of ranges) for (let o = s; o <= e; o++) if (bsbWj.has(o)) return true
  return false
}

{
  const studies: StudyJson[] = []
  if (fs.existsSync(STUDIES_DIR)) {
    for (const file of fs.readdirSync(STUDIES_DIR).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      const doc = loadYaml(readText(path.join(STUDIES_DIR, file))) as StudyYaml
      if (!doc?.id || !doc.title || !Array.isArray(doc.views)) throw new Error(`${file}: needs id, title and views`)
      const all: Range[] = []
      let refCount = 0
      const compileGroup = (g: StudyGroupYaml): StudyGroup => {
        const refs: StudyRef[] = g.refs.map((item) => {
          const r: StudyRefYaml = typeof item === 'string' ? { ref: item } : item
          const parsed = parseRefs(r.ref, canon)
          for (const err of parsed.errors) warn(`${file} › ${g.title}: ${err}`)
          if (!parsed.ranges.length) throw new Error(`${file} › ${g.title}: could not parse "${r.ref}"`)
          const ranges = parsed.ranges
          let to: Range[] | undefined
          if (r.to) {
            const parsedTo = parseRefs(r.to, canon)
            for (const err of parsedTo.errors) warn(`${file} › ${g.title}: ${err}`)
            if (!parsedTo.ranges.length) throw new Error(`${file} › ${g.title}: could not parse "${r.to}"`)
            to = parsedTo.ranges
          }
          if (r.category && doc.categories && !doc.categories[r.category]) throw new Error(`${file} › ${g.title}: unknown category "${r.category}"`)
          const links: StudyLink[] = []
          if (to) links.push({ ranges: to, label: to.map((x) => canon.rangeLabel(x[0], x[1])).join('; '), category: r.category, jesus: jesusSpeaksIn(to) })
          for (const l of r.links ?? []) {
            const parsedL = parseRefs(l.to, canon)
            for (const err of parsedL.errors) warn(`${file} › ${g.title} › ${r.ref}: ${err}`)
            if (!parsedL.ranges.length) throw new Error(`${file} › ${g.title} › ${r.ref}: could not parse link "${l.to}"`)
            if (l.category && doc.categories && !doc.categories[l.category]) throw new Error(`${file} › ${g.title} › ${r.ref}: unknown link category "${l.category}"`)
            links.push({
              ranges: parsedL.ranges,
              label: l.label ?? parsedL.ranges.map((x) => canon.rangeLabel(x[0], x[1])).join('; '),
              topic: l.topic,
              note: l.note,
              category: l.category,
              jesus: jesusSpeaksIn(parsedL.ranges),
            })
          }
          const jesus = jesusSpeaksIn(ranges) || links.some((l) => l.jesus)
          const weight = r.weight ?? g.weight ?? (jesus ? 3 : 1)
          all.push(...ranges)
          for (const l of links) all.push(...l.ranges)
          refCount++
          return {
            label: r.label ?? ranges.map((x) => canon.rangeLabel(x[0], x[1])).join('; '),
            ranges,
            verses: countVerses(ranges),
            weight,
            jesus,
            note: r.note,
            to,
            toLabel: to ? to.map((x) => canon.rangeLabel(x[0], x[1])).join('; ') : undefined,
            category: r.category,
            links: links.length ? links : undefined,
          }
        })
        return {
          id: g.id ?? slugify(g.title),
          title: g.title,
          note: g.note,
          refs,
          weight: refs.reduce((s, r) => s + r.weight, 0),
          verses: countVerses(mergeRanges(refs.flatMap((r) => r.ranges))),
        }
      }
      const authored: StudyView[] = doc.views
        .filter((v) => !v.auto)
        .map((v) => ({ id: v.id ?? slugify(v.title), title: v.title, note: v.note, groups: (v.groups ?? []).map(compileGroup) }))
      // A passage that appears in several views shares its links (and note) everywhere.
      const linksByKey = new Map<string, StudyLink[]>()
      const noteByKey = new Map<string, string>()
      for (const v of authored) for (const g of v.groups) for (const r of g.refs) {
        const k = JSON.stringify(r.ranges)
        const list = linksByKey.get(k) ?? linksByKey.set(k, []).get(k)!
        for (const l of r.links ?? []) if (!list.some((x) => x.label === l.label && x.topic === l.topic)) list.push(l)
        if (r.note && !noteByKey.has(k)) noteByKey.set(k, r.note)
      }
      for (const v of authored) for (const g of v.groups) for (const r of g.refs) {
        const k = JSON.stringify(r.ranges)
        const list = linksByKey.get(k)
        if (list?.length) {
          r.links = list
          if (list.some((l) => l.jesus) && !r.jesus) {
            r.jesus = true
            r.weight = Math.max(r.weight, 3)
          }
        }
        if (!r.note && noteByKey.has(k)) r.note = noteByKey.get(k)
        for (const l of r.links ?? []) all.push(...l.ranges)
      }
      for (const v of authored) for (const g of v.groups) {
        g.weight = g.refs.reduce((s, r) => s + r.weight, 0)
        g.verses = countVerses(mergeRanges(g.refs.flatMap((r) => r.ranges)))
      }
      // Every distinct reference across the authored views, in canonical order.
      const distinct = new Map<string, StudyRef>()
      for (const v of authored) for (const g of v.groups) for (const r of g.refs) {
        const k = JSON.stringify(r.ranges)
        if (!distinct.has(k)) distinct.set(k, { ...r })
      }
      const allRefs = [...distinct.values()].sort((a, b) => a.ranges[0][0] - b.ranges[0][0])
      const bucket = (title: string, refs: StudyRef[]): StudyGroup => ({
        id: slugify(title),
        title,
        refs,
        weight: refs.reduce((s, r) => s + r.weight, 0),
        verses: countVerses(mergeRanges(refs.flatMap((r) => r.ranges))),
      })
      const autoView = (v: StudyViewYaml): StudyView => {
        let groups: StudyGroup[] = []
        if (v.auto === 'book') {
          const nameFor = (b: number) => (b <= 39 ? 'Old Testament' : b === 40 ? 'Matthew' : b === 41 ? 'Mark' : b === 42 ? 'Luke' : b === 43 ? 'John' : b === 44 ? 'Acts' : b === 66 ? 'Revelation' : 'Epistles')
          const order = ['Old Testament', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Epistles', 'Revelation']
          const by = new Map<string, StudyRef[]>()
          for (const r of allRefs) {
            const n = nameFor(canon.locate(r.ranges[0][0]).b)
            ;(by.get(n) ?? by.set(n, []).get(n)!).push(r)
          }
          groups = order.filter((n) => by.has(n)).map((n) => bucket(n, by.get(n)!))
        } else if (v.auto === 'testament') {
          const ot = allRefs.filter((r) => canon.locate(r.ranges[0][0]).b <= 39)
          const nt = allRefs.filter((r) => canon.locate(r.ranges[0][0]).b > 39)
          groups = [bucket('Old Testament', ot), bucket('New Testament', nt)].filter((g) => g.refs.length)
        } else if (v.auto === 'category') {
          const cats = Object.entries(doc.categories ?? {})
          groups = cats.map(([id, c]) => bucket(c.title, allRefs.filter((r) => r.category === id))).filter((g) => g.refs.length)
          const rest = allRefs.filter((r) => !r.category || !doc.categories?.[r.category])
          if (rest.length) groups.push(bucket('Uncategorized', rest))
        } else if (v.auto === 'jesus') {
          groups = [bucket("In Jesus's own words", allRefs.filter((r) => r.jesus)), bucket('In the rest of Scripture', allRefs.filter((r) => !r.jesus))].filter((g) => g.refs.length)
        }
        return { id: v.id ?? slugify(v.title), title: v.title, note: v.note, groups }
      }
      const views: StudyView[] = doc.views.map((v) => (v.auto ? autoView(v) : authored.find((a) => a.id === (v.id ?? slugify(v.title)))!))
      const merged = mergeRanges(all)
      const study: StudyJson = {
        id: doc.id,
        title: doc.title,
        subtitle: doc.subtitle,
        summary: doc.summary,
        tags: doc.tags ?? [],
        kind: doc.kind,
        chart: doc.chart,
        categories: doc.categories ? Object.entries(doc.categories).map(([id, c]) => ({ id, title: c.title, note: c.note })) : undefined,
        views,
        ranges: merged,
        refCount,
        verseCount: countVerses(merged),
      }
      studies.push(study)
      writeJson(`studies/${study.id}.json`, study)
      log(`study ${study.id}: ${views.length} views, ${refCount} references, ${study.verseCount} verses`)
    }
  }
  writeJson(
    'studies/index.json',
    studies.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle, tags: s.tags, kind: s.kind, chart: s.chart, refCount: s.refCount, verseCount: s.verseCount })),
  )
}

// ---------------------------------------------------------------------------
// 8. Manifest.
// ---------------------------------------------------------------------------
writeJson('manifest.json', {
  generatedAt: new Date().toISOString().slice(0, 10),
  verses: canon.total,
  people: people.length,
  places: places.length,
  events: events.length,
  sources: [
    { id: 'bsb', name: 'Berean Standard Bible', license: 'Public domain', url: 'https://berean.bible' },
    { id: 'web', name: 'World English Bible', license: 'Public domain', url: 'https://ebible.org/web/' },
    { id: 'kjv', name: 'King James Version (1769)', license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases' },
    { id: 'asv', name: 'American Standard Version (1901)', license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases' },
    { id: 'ylt', name: "Young's Literal Translation (1898)", license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases' },
    { id: 'theographic', name: 'Theographic Bible Metadata', license: 'CC BY-SA 4.0', url: 'https://github.com/robertrouse/theographic-bible-metadata' },
    { id: 'openbible', name: 'OpenBible.info cross references', license: 'CC BY 4.0', url: 'https://www.openbible.info/labs/cross-references/' },
    { id: 'topical', name: "Nave's Topical Bible and Torrey's Topical Textbook (audited edition)", license: 'Public domain sources; pipeline MIT', url: 'https://github.com/j86schroeder/topical-bible-search' },
    { id: 'easton', name: "Easton's Bible Dictionary (1897), via Theographic", license: 'Public domain', url: 'https://www.ccel.org/ccel/easton/ebd2.html' },
  ],
})
log(`done: ${filesWritten} files, ${(bytesWritten / 1e6).toFixed(1)} MB`)
