/**
 * Compiles the raw sources in data/raw/quran and the hand-written files in data/quran into the
 * static JSON the Quran edition serves from public-quran/data. Deterministic: the same inputs
 * always produce the same files.
 *
 *   pnpm data:build:quran
 */
import fs from 'node:fs'
import path from 'node:path'
import { unzipSync } from 'fflate'
import { load as loadYaml } from 'js-yaml'
import { BOOKS as BIBLE_BOOKS } from '../src/editions/bible/books'
import { BOOKS, MEANINGS, SEVENTHS, seventhOf, seventhTitle } from '../src/editions/quran/books'
import { QURAN_REFS } from '../src/editions/quran/refs'
import { Canon } from '../src/lib/canon'
import { countVerses, mergeRanges, ordinalsToRanges, parseRefs, type Range } from '../src/lib/refs'
import { compileStudies, compileWritings, type Bucket, type StudyGroup, type StudyRef } from './lib/studies'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'data', 'raw', 'quran')
const SRC = path.join(ROOT, 'data', 'quran')
const PUBLIC = path.join(ROOT, 'public-quran')
const OUT = path.join(PUBLIC, 'data')

const t0 = Date.now()
const log = (...a: unknown[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)
const warn = (...a: unknown[]) => console.warn('  !', ...a)
const readText = (p: string) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '')
const readJson = <T>(p: string): T => JSON.parse(readText(p)) as T
const readYaml = <T>(name: string, empty: T): T => {
  const p = path.join(SRC, name)
  return fs.existsSync(p) ? ((loadYaml(readText(p)) as T | undefined) ?? empty) : empty
}
const uniq = <T>(xs: T[]) => [...new Set(xs)]
const shardOf = (id: string) => (/^[a-z]/.test(id) ? id[0] : '_')

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

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------------------
// 1. The verse grid: 114 surahs, each a book of one chapter, 6,236 verses.
// ---------------------------------------------------------------------------
interface AlquranMeta {
  data: {
    surahs: { references: { number: number; name: string; englishName: string; numberOfAyahs: number; revelationType: string }[] }
    sajdas: { references: { surah: number; ayah: number }[] }
    rukus: { references: { surah: number; ayah: number }[] }
  }
}
const meta = readJson<AlquranMeta>(path.join(RAW, 'alquran-meta.json')).data
const canon = new Canon(
  BOOKS,
  BOOKS.map((b) => [meta.surahs.references[b.n - 1].numberOfAyahs]),
  QURAN_REFS,
)
if (canon.total !== 6236) throw new Error(`grid mismatch: ${canon.total} verses, expected 6,236`)
for (const s of meta.surahs.references) {
  const b = canon.book(s.number)
  if (b.group !== s.revelationType) throw new Error(`surah ${s.number}: the table says ${b.group}, the source ${s.revelationType}`)
}
log(`canon: ${canon.total} verses in ${canon.books.length} surahs`)
const ord = (s: number, v: number) => {
  const o = canon.ordinal(s, 1, v)
  if (o < 0) throw new Error(`no verse ${s}:${v}`)
  return o
}
/** A reference written in a source file, checked: it must parse cleanly. */
const refsOf = (ref: string, where: string): Range[] => {
  const r = parseRefs(String(ref), canon)
  if (!r.ranges.length || r.errors.length) throw new Error(`${where}: could not read "${ref}" (${r.errors.join('; ')})`)
  return r.ranges
}

// ---------------------------------------------------------------------------
// 2. What is known of each surah: its order of revelation, and what it is about.
// ---------------------------------------------------------------------------
interface QuranComChapter {
  id: number
  revelation_place: string
  revelation_order: number
  name_arabic: string
  verses_count: number
}
const chapters = readJson<{ chapters: QuranComChapter[] }>(path.join(RAW, 'qurancom-chapters.json')).chapters
/** Nöldeke's order of the surahs (Geschichte des Qorans, 1860), in his four periods. */
const NOLDEKE: [period: string, surahs: number[]][] = [
  ['First Meccan', [96, 74, 111, 106, 108, 104, 107, 102, 105, 92, 90, 94, 93, 97, 86, 91, 80, 68, 87, 95, 103, 85, 73, 101, 99, 82, 81, 53, 84, 100, 79, 77, 78, 88, 89, 75, 83, 69, 51, 52, 56, 70, 55, 112, 109, 113, 114, 1]],
  ['Second Meccan', [54, 37, 71, 76, 44, 50, 20, 26, 15, 19, 38, 36, 43, 72, 67, 23, 21, 25, 17, 27, 18]],
  ['Third Meccan', [32, 41, 45, 16, 30, 11, 14, 12, 40, 28, 39, 29, 31, 42, 10, 34, 35, 7, 46, 6, 13]],
  ['Medinan', [2, 98, 64, 62, 8, 47, 3, 61, 57, 4, 65, 59, 33, 63, 24, 58, 22, 48, 66, 60, 110, 49, 9, 5]],
]
const noldeke = new Map<number, { n: number; period: string }>()
{
  let n = 0
  for (const [period, surahs] of NOLDEKE) for (const s of surahs) noldeke.set(s, { n: ++n, period })
  if (noldeke.size !== 114) throw new Error(`Nöldeke's order lists ${noldeke.size} surahs`)
}
const orderOf = new Map(chapters.map((c) => [c.id, c.revelation_order]))
if (uniq([...orderOf.values()]).length !== 114) throw new Error('the order of revelation is not a full ordering')
for (const c of chapters) {
  const b = canon.book(c.id)
  if (c.verses_count !== b.verseCount) throw new Error(`surah ${c.id}: verse counts differ between sources`)
  if ((c.revelation_place === 'makkah') !== (b.group === 'Meccan')) throw new Error(`surah ${c.id}: place of revelation differs between sources`)
}

interface SurahYaml {
  summary?: string
  /** the disconnected letters the surah opens with */
  letters?: string
  /** the sections of the surah: the verse each starts at, and its heading */
  sections?: [verse: number, heading: string][]
}
const surahNotes = readYaml<Record<number, SurahYaml>>('surahs.yaml', {})
const sajdas = new Map<number, number[]>()
for (const s of meta.sajdas.references) (sajdas.get(s.surah) ?? sajdas.set(s.surah, []).get(s.surah)!).push(s.ayah)

/** The headings of every surah's sections, by the ordinal of the verse each starts at. */
const headings: Record<number, string> = {}
for (const [n, note] of Object.entries(surahNotes)) {
  const book = canon.book(+n)
  let last = 0
  for (const [v, heading] of note.sections ?? []) {
    if (v <= last || v > book.verseCount) throw new Error(`surahs.yaml › ${n}: section at verse ${v} is out of order or past the end`)
    last = v
    headings[ord(+n, v)] = heading
  }
}
log(`surah notes: ${Object.values(surahNotes).filter((s) => s.summary).length} summaries, ${Object.keys(headings).length} section headings`)

// 3. The order of revelation, for every verse: what places a passage on a study's timeline.
const years: number[] = new Array(canon.total)
for (const b of canon.books) for (let o = b.start; o < b.start + b.verseCount; o++) years[o] = orderOf.get(b.n)!
writeJson('years.json', years)

// ---------------------------------------------------------------------------
// 4. The text: the Arabic, and three translations into English.
// ---------------------------------------------------------------------------
interface TextJson {
  id: string
  name: string
  abbrev: string
  year?: string
  license: string
  attribution: string
  rtl?: boolean
  lang?: string
  verses: string[]
  headings?: Record<number, string>
  /** the line said before a surah's first verse: "In the name of God, the Gracious, the Merciful." */
  pre?: Record<number, string>
}
interface AlquranText {
  data: { surahs: { number: number; ayahs: { numberInSurah: number; text: string }[] }[] }
}
const clean = (t: string) => t.replace(/﻿/g, '').replace(/\s+/g, ' ').trim()
/** Every surah but the ninth opens with the basmala; in the first it is verse 1 itself. */
const opensWithBasmala = (n: number) => n !== 1 && n !== 9

function fromAlquran(file: string): string[] {
  const verses: string[] = new Array(canon.total).fill('')
  for (const s of readJson<AlquranText>(path.join(RAW, file)).data.surahs) for (const a of s.ayahs) verses[ord(s.number, a.numberInSurah)] = clean(a.text)
  return verses
}
/** A translation that does not repeat the basmala before each surah gets its own rendering of 1:1 there. */
const basmalaBefore = (line: string) => Object.fromEntries(canon.books.filter((b) => opensWithBasmala(b.n)).map((b) => [b.start, line]))
const checkFull = (id: string, verses: string[]) => {
  const empty = verses.filter((v) => !v).length
  if (empty) throw new Error(`${id}: ${empty} verses are empty`)
  log(`${id}: ${verses.length} verses`)
}

const texts: TextJson[] = []
{
  // Talal Itani: one file per verse, and a file numbered 000 for the basmala before a surah.
  const zip = unzipSync(new Uint8Array(fs.readFileSync(path.join(RAW, 'clearquran-god.zip'))))
  const verses: string[] = new Array(canon.total).fill('')
  const pre: Record<number, string> = {}
  const decoder = new TextDecoder('utf-8')
  for (const [name, data] of Object.entries(zip)) {
    const m = /^(\d{3})-(\d{3})\.txt$/.exec(name)
    if (!m) continue
    const text = clean(decoder.decode(data))
    if (+m[2] === 0) pre[ord(+m[1], 1)] = text
    else verses[ord(+m[1], +m[2])] = text
  }
  checkFull('itani', verses)
  texts.push({
    id: 'itani',
    name: 'Quran in English (Talal Itani)',
    abbrev: 'Itani',
    year: '2012',
    license: 'CC BY-ND 4.0',
    attribution: 'Translation by Talal Itani, ClearQuran.com. Shared unchanged under the Creative Commons Attribution-NoDerivatives 4.0 license.',
    verses,
    pre,
  })
}
{
  const verses = fromAlquran('alquran-en.wahiduddin.json')
  checkFull('khan', verses)
  texts.push({
    id: 'khan',
    name: 'The Quran (Wahiduddin Khan)',
    abbrev: 'Khan',
    year: '2009',
    license: 'Copyright-free (by its publisher)',
    attribution: 'Translated by Maulana Wahiduddin Khan, edited by Farida Khanam (Goodword Books, 2009), published free of copyright. Text from Tanzil.net. Words in square brackets are the translator’s.',
    verses,
    pre: basmalaBefore(verses[0]),
  })
}
{
  const verses = fromAlquran('alquran-en.pickthall.json')
  checkFull('pickthall', verses)
  texts.push({
    id: 'pickthall',
    name: 'The Meaning of the Glorious Koran (Pickthall)',
    abbrev: 'Pickthall',
    year: '1930',
    license: 'Public domain',
    attribution: 'The Meaning of the Glorious Koran, an explanatory translation by Marmaduke Pickthall (1930), public domain. Text from Tanzil.net.',
    verses,
    pre: basmalaBefore(verses[0]),
  })
}
{
  // The Arabic: Tanzil's Uthmani text, unchanged. It repeats the basmala at the head of verse 1
  // of each surah; here it stands on its own line before the verse, as it does in print.
  const verses = fromAlquran('alquran-uthmani.json')
  const pre: Record<number, string> = {}
  const bare = (w: string) => w.replace(/[^ء-ي]/g, '')
  for (const b of canon.books) {
    if (!opensWithBasmala(b.n)) continue
    const words = verses[b.start].split(' ')
    if (bare(words[0]) !== 'بسم' || words.length < 5) throw new Error(`arabic: surah ${b.n} does not open with the basmala`)
    pre[b.start] = words.slice(0, 4).join(' ')
    verses[b.start] = words.slice(4).join(' ')
  }
  checkFull('arabic', verses)
  texts.push({
    id: 'arabic',
    name: 'The Quran in Arabic (Uthmani script)',
    abbrev: 'Arabic',
    license: 'CC BY 3.0',
    attribution: 'Tanzil Quran Text (Uthmani), copyright Tanzil Project, tanzil.net. Shared verbatim under the Creative Commons Attribution 3.0 license.',
    rtl: true,
    lang: 'ar',
    verses,
    pre,
  })
}
for (const t of texts) writeJson(`bibles/${t.id}.json`, { ...t, headings })
writeJson(
  'bibles/index.json',
  texts.map((t) => ({ id: t.id, name: t.name, abbrev: t.abbrev, redLetter: false, headings: Object.keys(headings).length > 0, original: t.rtl || undefined })),
)
const english = texts[0].verses

// ---------------------------------------------------------------------------
// 5. The words of the Arabic: every word's dictionary form, from the morphology.
// ---------------------------------------------------------------------------
/**
 * lemma -> the verses it occurs in, in order (one entry per occurrence). Lemmas are compared in
 * Unicode's composed form, so the order in which a vowel and a doubling mark were typed does not matter.
 */
const lemmaVerses = new Map<string, number[]>()
/** the same, counting only where the word is tagged as a name */
const nameVerses = new Map<string, number[]>()
const lemmaRoot = new Map<string, string>()
/** the words of each verse that carry meaning, as lemmas in order */
const content: string[][] = Array.from({ length: canon.total }, () => [])
{
  const SKIP = new Set(['PRON', 'REL', 'DEM', 'COND', 'INTG', 'T', 'LOC', 'NV', 'INL'])
  for (const line of readText(path.join(RAW, 'quran-morphology.txt')).split('\n')) {
    if (!line.trim()) continue
    const [loc, , tag, feat] = line.split('\t')
    if (tag !== 'N' && tag !== 'V') continue
    const f = feat.split('|')
    const lemma = f.find((x) => x.startsWith('LEM:'))?.slice(4).normalize('NFC')
    if (!lemma) continue
    const [s, v] = loc.split(':').map(Number)
    const o = ord(s, v)
    const root = f.find((x) => x.startsWith('ROOT:'))?.slice(5)
    const isName = f.includes('PN')
    ;(lemmaVerses.get(lemma) ?? lemmaVerses.set(lemma, []).get(lemma)!).push(o)
    if (isName) (nameVerses.get(lemma) ?? nameVerses.set(lemma, []).get(lemma)!).push(o)
    if (root) lemmaRoot.set(lemma, root)
    if ((root || isName) && !f.some((x) => SKIP.has(x))) content[o].push(lemma)
  }
  log(`morphology: ${lemmaVerses.size} lemmas, ${nameVerses.size} of them names`)
}

// ---------------------------------------------------------------------------
// 6. People and places: hand-written entries, their verses read off the Arabic.
// ---------------------------------------------------------------------------
interface EntityYaml {
  id: string
  name: string
  /** what the page is called when the name alone is not enough: "Moses (Musa)" */
  title?: string
  arabic?: string
  translit?: string
  meaning?: string
  aka?: string[]
  /** prophet, angel, people... (a person); city, mountain... (a place) */
  kind?: string
  gender?: string
  /** dictionary forms that name it, counted where the Arabic tags the word as a name */
  names?: string[]
  /** dictionary forms counted wherever they occur (a word that is never anything else) */
  lemmas?: string[]
  /** a pattern looked for in the English of Talal Itani, for a name of several words */
  text?: string
  /** verses to add by hand, and to take away */
  refs?: string
  except?: string
  about?: string
  /** the same person or place on Bible-Map, as an id there */
  bible?: string
  father?: string[]
  mother?: string[]
  partners?: string[]
  children?: string[]
  siblings?: string[]
  lat?: number
  lon?: number
  /** how sure the coordinates are, when they are not exact: "by tradition" */
  precision?: string
}
function versesOf(e: EntityYaml, where: string): number[] {
  const set = new Set<number>()
  for (const l of e.names ?? []) {
    const hits = nameVerses.get(l.normalize('NFC'))
    if (!hits) throw new Error(`${where} › ${e.id}: no word is tagged as the name "${l}"`)
    for (const o of hits) set.add(o)
  }
  for (const l of e.lemmas ?? []) {
    const hits = lemmaVerses.get(l.normalize('NFC'))
    if (!hits) throw new Error(`${where} › ${e.id}: the Arabic has no word "${l}"`)
    for (const o of hits) set.add(o)
  }
  if (e.text) {
    const re = new RegExp(e.text)
    let n = 0
    english.forEach((t, o) => {
      if (re.test(t)) {
        set.add(o)
        n++
      }
    })
    if (!n) throw new Error(`${where} › ${e.id}: nothing in the translation matches /${e.text}/`)
  }
  if (e.refs) for (const [a, z] of refsOf(e.refs, `${where} › ${e.id}`)) for (let o = a; o <= z; o++) set.add(o)
  if (e.except) for (const [a, z] of refsOf(e.except, `${where} › ${e.id}`)) for (let o = a; o <= z; o++) set.delete(o)
  if (!set.size) throw new Error(`${where} › ${e.id}: no verses`)
  return [...set].sort((a, b) => a - b)
}
const nameMeaning = (e: EntityYaml) => (e.arabic || e.meaning ? { arabic: e.arabic, translit: e.translit, meaning: e.meaning } : undefined)
const tidy = (t?: string) => t?.replace(/\s*\n\s*/g, ' ').trim() || undefined

const peopleYaml = readYaml<EntityYaml[]>('people.yaml', [])
const placesYaml = readYaml<EntityYaml[]>('places.yaml', [])
const personIds = new Set(peopleYaml.map((p) => p.id))
const placeIds = new Set(placesYaml.map((p) => p.id))
const known = (ids: string[] | undefined, set: Set<string>, where: string) => {
  for (const id of ids ?? []) if (!set.has(id)) throw new Error(`${where}: there is no "${id}"`)
  return ids ?? []
}

interface EventYaml {
  id: string
  title: string
  year?: number
  /** "8D", "3Y": how long it lasted */
  duration?: string
  people?: string[]
  places?: string[]
  refs?: string
  notes?: string
  /** the event this one is a part of */
  partOf?: string
}
const eventsYaml = readYaml<EventYaml[]>('events.yaml', [])
// In order of time; events of one year keep the order they are written in.
const events = [...eventsYaml]
  .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
  .map((e, i) => ({
  id: e.id,
  title: e.title,
  year: e.year ?? null,
  duration: e.duration,
  participants: known(e.people, personIds, `events.yaml › ${e.id}`),
  locations: known(e.places, placeIds, `events.yaml › ${e.id}`),
  verses: e.refs ? [...new Set(refsOf(e.refs, `events.yaml › ${e.id}`).flatMap(([a, z]) => Array.from({ length: z - a + 1 }, (_, k) => a + k)))].sort((a, b) => a - b) : [],
  predecessor: [] as string[],
  partOf: e.partOf ? [e.partOf] : [],
    sort: i,
    notes: tidy(e.notes),
  }))
{
  const ids = new Set(events.map((e) => e.id))
  if (ids.size !== events.length) throw new Error('events.yaml: two events share an id')
  for (const e of events) for (const p of e.partOf) if (!ids.has(p)) throw new Error(`events.yaml › ${e.id}: there is no event "${p}"`)
}
writeJson('events.json', events)
log(`events: ${events.length}`)

const people = peopleYaml
  .map((p) => {
    const verses = versesOf(p, 'people.yaml')
    const where = `people.yaml › ${p.id}`
    return {
      id: p.id,
      name: p.name,
      title: p.title ?? p.name,
      kind: p.kind,
      gender: p.gender,
      aka: p.aka ?? [],
      father: known(p.father, personIds, where),
      mother: known(p.mother, personIds, where),
      partners: known(p.partners, personIds, where),
      children: known(p.children, personIds, where),
      siblings: known(p.siblings, personIds, where),
      birthPlace: [] as string[],
      deathPlace: [] as string[],
      events: events.filter((e) => e.participants.includes(p.id)).map((e) => e.id),
      verses,
      verseCount: verses.length,
      dict: tidy(p.about),
      name_meaning: nameMeaning(p),
      bible: p.bible,
    }
  })
  .sort((a, b) => a.id.localeCompare(b.id))
const places = placesYaml
  .map((p) => {
    const verses = versesOf(p, 'places.yaml')
    return {
      id: p.id,
      name: p.title ?? p.name,
      lat: p.lat,
      lon: p.lon,
      precision: p.precision,
      type: p.kind,
      aliases: p.aka ?? [],
      events: events.filter((e) => e.locations.includes(p.id)).map((e) => e.id),
      peopleBorn: [] as string[],
      peopleDied: [] as string[],
      verses,
      verseCount: verses.length,
      dict: tidy(p.about),
      name_meaning: nameMeaning(p),
      bible: p.bible,
    }
  })
  .sort((a, b) => a.id.localeCompare(b.id))
function writeShards<T extends { id: string }>(dir: string, items: T[], index: (item: T) => object) {
  const shards = new Map<string, Record<string, T>>()
  for (const it of items) {
    const s = shardOf(it.id)
    if (!shards.has(s)) shards.set(s, {})
    shards.get(s)![it.id] = it
  }
  for (const [s, obj] of shards) writeJson(`${dir}/${s}.json`, obj)
  writeJson(
    `${dir}/index.json`,
    items.map((it) => ({ ...index(it), shard: shardOf(it.id) })),
  )
}
writeShards('people', people, (p) => ({ id: p.id, title: p.title, kind: p.kind, gender: p.gender, verseCount: p.verseCount, aka: p.aka.length ? p.aka : undefined, meaning: p.name_meaning?.meaning }))
writeShards('places', places, (p) => ({ id: p.id, name: p.name, type: p.type, verseCount: p.verseCount, lat: p.lat, lon: p.lon, aliases: p.aliases.length ? p.aliases : undefined, meaning: p.name_meaning?.meaning }))
log(`people: ${people.length}, places: ${places.length}`)

// Verse -> people and places, per surah.
const perSurah = <T>() => new Map<number, Record<number, T>>()
{
  const ents = perSurah<[string[], string[]]>()
  const row = (o: number) => {
    const b = canon.locate(o).b
    if (!ents.has(b)) ents.set(b, {})
    return (ents.get(b)![o] ??= [[], []])
  }
  for (const p of people) for (const o of p.verses) row(o)[0].push(p.id)
  for (const p of places) for (const o of p.verses) row(o)[1].push(p.id)
  for (const [b, obj] of ents) writeJson(`entities/${canon.book(b).osis}.json`, obj)
  log(`verse entities: ${[...ents.values()].reduce((s, o) => s + Object.keys(o).length, 0)} verses linked`)
}

// Surah data, now that people and places are counted.
writeJson('books.json', {
  total: canon.total,
  books: canon.books.map((b) => {
    const end = b.start + b.verseCount - 1
    const note = surahNotes[b.n] ?? {}
    const nol = noldeke.get(b.n)!
    const chapter = chapters[b.n - 1]
    return {
      n: b.n,
      osis: b.osis,
      name: b.name,
      division: b.division,
      chapters: b.chapters,
      writers: [],
      peopleCount: people.filter((p) => p.verses.some((o) => o >= b.start && o <= end)).length,
      placeCount: places.filter((p) => p.verses.some((o) => o >= b.start && o <= end)).length,
      surah: {
        arabic: chapter.name_arabic,
        meaning: MEANINGS[b.n - 1],
        place: b.group,
        order: orderOf.get(b.n),
        noldeke: nol.n,
        period: nol.period,
        summary: tidy(note.summary),
        sajda: sajdas.get(b.n),
        letters: note.letters,
      },
    }
  }),
})

// ---------------------------------------------------------------------------
// 7. Related verses: for every verse, the verses that share the most of its wording.
//    Each verse is its meaningful words (as dictionary forms) and the pairs of them that stand
//    together; a word or a pair counts for more the fewer verses have it; two verses are as alike
//    as the cosine between them. Computed from the Arabic, so it does not depend on a translation.
// ---------------------------------------------------------------------------
{
  const N = canon.total
  const KEEP = 12
  const MIN = 0.3
  const docs: Map<string, number>[] = content.map((words) => {
    const tf = new Map<string, number>()
    const add = (t: string) => tf.set(t, (tf.get(t) ?? 0) + 1)
    words.forEach((w, i) => {
      add(w)
      if (i > 0) add(`${words[i - 1]} ${w}`)
    })
    return tf
  })
  const df = new Map<string, number>()
  for (const d of docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const postings = new Map<string, [number, number][]>()
  const norm = new Float64Array(N)
  docs.forEach((d, o) => {
    let sq = 0
    for (const [t, n] of d) {
      const n_ = df.get(t)!
      if (n_ < 2) continue
      const w = (1 + Math.log(n)) * Math.log(N / n_)
      sq += w * w
      ;(postings.get(t) ?? postings.set(t, []).get(t)!).push([o, w])
    }
    norm[o] = Math.sqrt(sq)
  })
  const tables = perSurah<[number, number, number][]>()
  const matrix = canon.books.map(() => canon.books.map(() => 0))
  const score = new Float64Array(N)
  let links = 0
  let linked = 0
  for (let o = 0; o < N; o++) {
    // A verse needs three meaningful words to be compared: shorter ones match too much by chance.
    if (content[o].length < 3) continue
    const touched: number[] = []
    for (const [t, n] of docs[o]) {
      const list = postings.get(t)
      if (!list) continue
      const w = (1 + Math.log(n)) * Math.log(N / df.get(t)!)
      for (const [p, pw] of list) {
        if (p === o) continue
        if (score[p] === 0) touched.push(p)
        score[p] += w * pw
      }
    }
    const best: [number, number][] = []
    for (const p of touched) {
      const c = score[p] / (norm[o] * norm[p])
      score[p] = 0
      if (c >= MIN && content[p].length >= 3) best.push([p, c])
    }
    if (!best.length) continue
    best.sort((a, b) => b[1] - a[1] || a[0] - b[0])
    const b = canon.locate(o).b
    if (!tables.has(b)) tables.set(b, {})
    tables.get(b)![o] = best.slice(0, KEEP).map(([p, c]) => {
      matrix[b - 1][canon.locate(p).b - 1]++
      return [p, p, Math.round(c * 100)] as [number, number, number]
    })
    links += Math.min(best.length, KEEP)
    linked++
  }
  for (const [b, obj] of tables) writeJson(`xrefs/${canon.book(b).osis}.json`, obj)
  writeJson('xrefs/matrix.json', { books: canon.books.map((x) => x.osis), counts: matrix })
  log(`related verses: ${links} links from ${linked} verses`)
}

// ---------------------------------------------------------------------------
// 8. Words of the Quran: a hand-written list of its key words, each with every verse that uses it.
// ---------------------------------------------------------------------------
interface WordYaml {
  id: string
  title: string
  /** a line on what the word means and how the Quran uses it */
  note?: string
  seeAlso?: string[]
  /** the Arabic dictionary forms gathered under this word, each with how it is said and what it means */
  forms: { lemma: string; say: string; gloss: string }[]
}
{
  const words = readYaml<WordYaml[]>('words.yaml', [])
  const seen = new Set<string>()
  const out = words.map((w) => {
    if (seen.has(w.id)) throw new Error(`words.yaml: two words share the id "${w.id}"`)
    seen.add(w.id)
    const entries = w.forms.map((f) => {
      const hits = lemmaVerses.get(f.lemma.normalize('NFC'))
      if (!hits) throw new Error(`words.yaml › ${w.id}: the Arabic has no word "${f.lemma}"`)
      const verses = uniq(hits)
      return { text: `${f.say} (${f.lemma}): ${f.gloss}. ${hits.length} time${hits.length === 1 ? '' : 's'} in ${verses.length} verse${verses.length === 1 ? '' : 's'}.`, refs: ordinalsToRanges(verses) }
    })
    return { id: `word:${w.id}`, title: w.title, source: 'word', note: tidy(w.note), seeAlso: w.seeAlso ?? [], aka: w.forms.map((f) => `${f.say} ${f.lemma}`).join(' '), entries }
  })
  const shards = new Map<string, Record<string, object>>()
  for (const { aka: _aka, ...t } of out) {
    const s = shardOf(t.id.split(':')[1])
    if (!shards.has(s)) shards.set(s, {})
    shards.get(s)![t.id] = t
  }
  for (const [s, obj] of shards) writeJson(`topics/${s}.json`, obj)
  writeJson(
    'topics/index.json',
    out.map((t) => ({ id: t.id, title: t.title, source: t.source, aka: t.aka, entries: t.entries.length, verses: countVerses(mergeRanges(t.entries.flatMap((e) => e.refs))), shard: shardOf(t.id.split(':')[1]) })),
  )
  log(`words: ${out.length}`)
}

// ---------------------------------------------------------------------------
// 9. Studies and writings.
// ---------------------------------------------------------------------------
{
  // The Bible's own verse grid, so a study can point at the parallel passage on Bible-Map.
  const bibleBooks = readJson<{ books: { n: number; chapters: number[] }[] }>(path.join(ROOT, 'public', 'data', 'books.json'))
  const bible = Canon.fromJson(BIBLE_BOOKS, { total: 0, books: bibleBooks.books })
  const surahOf = (r: StudyRef) => canon.locate(r.ranges[0][0]).b
  // Views the Quran can derive: where each passage was revealed, in which of Nöldeke's periods,
  // and in which seventh of the text it stands.
  const autoGroups = (auto: string, allRefs: StudyRef[], bucket: Bucket): StudyGroup[] | undefined => {
    if (auto === 'place')
      return [
        bucket('Revealed at Mecca', allRefs.filter((r) => canon.book(surahOf(r)).group === 'Meccan'), 'Surahs the traditional classification places before the move to Medina in 622.'),
        bucket('Revealed at Medina', allRefs.filter((r) => canon.book(surahOf(r)).group === 'Medinan'), 'Surahs the traditional classification places after the move to Medina in 622.'),
      ].filter((g) => g.refs.length)
    if (auto === 'period') return NOLDEKE.map(([period]) => bucket(period, allRefs.filter((r) => noldeke.get(surahOf(r))!.period === period))).filter((g) => g.refs.length)
    if (auto === 'part') return SEVENTHS.map((_, i) => bucket(seventhTitle(i), allRefs.filter((r) => seventhOf(surahOf(r)) === i))).filter((g) => g.refs.length)
    return undefined
  }
  const studies = compileStudies({ canon, dir: path.join(SRC, 'studies'), autoGroups, bible, warn })
  for (const study of studies) {
    writeJson(`studies/${study.id}.json`, study)
    log(`study ${study.id}: ${study.views.length} views, ${study.refCount} references, ${study.verseCount} verses`)
  }
  writeJson(
    'studies/index.json',
    studies.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle, tags: s.tags, added: s.added, kind: s.kind, chart: s.chart, refCount: s.refCount, verseCount: s.verseCount, ranges: s.ranges })),
  )
  const { index, docs } = compileWritings(path.join(SRC, 'writings'), canon)
  for (const w of docs) {
    writeJson(`writings/${w.id}.json`, w)
    log(`writing ${w.id}: ${w.body.length} paragraphs, ${w.passages.length} passages`)
  }
  writeJson('writings/index.json', index)
}

// ---------------------------------------------------------------------------
// 10. No sitemap: the site is not listed. Crawlers may read a page, so that they find its
//     request not to be indexed; a page a crawler may not read can still be listed by its address.
// ---------------------------------------------------------------------------
fs.writeFileSync(path.join(PUBLIC, 'robots.txt'), 'User-agent: *\nAllow: /\n')

// ---------------------------------------------------------------------------
// 11. Manifest.
// ---------------------------------------------------------------------------
writeJson('manifest.json', {
  generatedAt: new Date().toISOString().slice(0, 10),
  verses: canon.total,
  people: people.length,
  places: places.length,
  events: events.length,
  sources: [
    { id: 'arabic', name: 'Tanzil Quran Text (Uthmani)', license: 'CC BY 3.0', url: 'https://tanzil.net', note: 'The Arabic text, unchanged. Copyright Tanzil Project.' },
    { id: 'itani', name: 'Quran in English, translated by Talal Itani (2012)', license: 'CC BY-ND 4.0', url: 'https://www.clearquran.com', note: 'The default translation, shown unchanged. Translation by Talal Itani, ClearQuran.com.' },
    { id: 'khan', name: 'The Quran, translated by Wahiduddin Khan (Goodword Books, 2009)', license: 'Published copyright-free', url: 'https://www.goodwordbooks.com', note: 'Text as distributed by Tanzil.net.' },
    { id: 'pickthall', name: 'The Meaning of the Glorious Koran, by Marmaduke Pickthall (1930)', license: 'Public domain', url: 'https://en.wikisource.org/wiki/The_Meaning_of_the_Glorious_Koran_(1930)', note: 'Text as distributed by Tanzil.net.' },
    { id: 'corpus', name: 'Quranic Arabic Corpus, morphology 0.4 (Kais Dukes, University of Leeds)', license: 'GNU GPL', url: 'https://corpus.quran.com', note: 'The dictionary form and part of speech of every word, in the revision by mustafa0x (github.com/mustafa0x/quran-morphology). Names, word lists and related verses are read from it.' },
    { id: 'alquran', name: 'Al Quran Cloud', license: 'Open API', url: 'https://alquran.cloud', note: 'Serves the Tanzil texts, and the divisions of the text: verse counts, prostrations, reading portions.' },
    { id: 'qurancom', name: 'Quran.com chapter data', license: 'Open API', url: 'https://quran.com', note: 'Surah names in English letters and in Arabic, and the traditional order of revelation (the standard Egyptian edition of 1924).' },
    { id: 'noldeke', name: 'Theodor Nöldeke, Geschichte des Qorans (1860): the four periods', license: 'Public domain', url: 'https://en.wikipedia.org/wiki/Geschichte_des_Qor%C4%81ns' },
  ],
})
log(`done: ${filesWritten} files, ${(bytesWritten / 1e6).toFixed(1)} MB`)
