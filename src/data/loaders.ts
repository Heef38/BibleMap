import { Canon } from '@/lib/canon'
import type {
  Bible,
  BibleEvent,
  BibleMeta,
  BooksJson,
  Manifest,
  Person,
  PersonIndexEntry,
  Place,
  PlaceIndexEntry,
  Study,
  StudyIndexEntry,
  Topic,
  TopicIndexEntry,
  VerseEntities,
  XrefTable,
} from './types'

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data/`
const inflight = new Map<string, Promise<unknown>>()

export function fetchJson<T>(rel: string): Promise<T> {
  const hit = inflight.get(rel)
  if (hit) return hit as Promise<T>
  const p = fetch(BASE + rel).then(async (res) => {
    if (!res.ok) throw new Error(`Could not load ${rel} (${res.status})`)
    return (await res.json()) as T
  })
  p.catch(() => inflight.delete(rel))
  inflight.set(rel, p)
  return p
}

export const shardOf = (id: string) => (/^[a-z]/.test(id) ? id[0] : '_')
const topicShard = (id: string) => shardOf(id.split(':')[1] ?? id)

let canonPromise: Promise<Canon> | null = null
export function loadCanon(): Promise<Canon> {
  canonPromise ??= fetchJson<BooksJson>('books.json').then((j) => Canon.fromJson(j))
  return canonPromise
}

export const loadBooks = () => fetchJson<BooksJson>('books.json')
export const loadBibleIndex = () => fetchJson<BibleMeta[]>('bibles/index.json')
export const loadBible = (id: string) => fetchJson<Bible>(`bibles/${id}.json`)
export const loadYears = () => fetchJson<(number | null)[]>('years.json')
export const loadPeopleIndex = () => fetchJson<PersonIndexEntry[]>('people/index.json')
export const loadPerson = (id: string) =>
  fetchJson<Record<string, Person>>(`people/${shardOf(id)}.json`).then((s) => {
    const p = s[id]
    if (!p) throw new Error(`No person “${id}”`)
    return p
  })
export const loadPlacesIndex = () => fetchJson<PlaceIndexEntry[]>('places/index.json')
export const loadPlace = (id: string) =>
  fetchJson<Record<string, Place>>(`places/${shardOf(id)}.json`).then((s) => {
    const p = s[id]
    if (!p) throw new Error(`No place “${id}”`)
    return p
  })
export const loadEvents = () => fetchJson<BibleEvent[]>('events.json')
export const loadEntities = (osis: string) => fetchJson<VerseEntities>(`entities/${osis}.json`).catch(() => ({}) as VerseEntities)
export const loadXrefs = (osis: string) => fetchJson<XrefTable>(`xrefs/${osis}.json`).catch(() => ({}) as XrefTable)
export const loadTopicsIndex = () => fetchJson<TopicIndexEntry[]>('topics/index.json')
export const loadTopic = (id: string) =>
  fetchJson<Record<string, Topic>>(`topics/${topicShard(id)}.json`).then((s) => {
    const t = s[id]
    if (!t) throw new Error(`No topic “${id}”`)
    return t
  })
export const loadStudiesIndex = () => fetchJson<StudyIndexEntry[]>('studies/index.json')
export const loadStudy = (id: string) => fetchJson<Study>(`studies/${id}.json`)
export const loadManifest = () => fetchJson<Manifest>('manifest.json')
