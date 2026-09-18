import type { Range } from '@/lib/refs'

export interface BookJson {
  n: number
  osis: string
  usfm: string
  name: string
  short: string
  testament: 'OT' | 'NT'
  division: string
  chapters: number[]
  /** traditional writers, as person ids */
  writers: string[]
  peopleCount: number
  placeCount: number
}
export interface BooksJson {
  total: number
  books: BookJson[]
}

export interface BibleMeta {
  id: string
  name: string
  abbrev: string
  redLetter: boolean
  headings: boolean
}
export interface Bible {
  id: string
  name: string
  abbrev: string
  year?: string
  license: string
  attribution: string
  verses: string[]
  /** ordinal -> [start, end) character spans spoken by Jesus */
  wj?: Record<number, [number, number][]>
  /** ordinal -> section heading shown before that verse */
  headings?: Record<number, string>
}

export interface PersonIndexEntry {
  id: string
  title: string
  gender?: string
  verseCount: number
  birth?: number
  death?: number
  aka?: string[]
  shard: string
}
export interface Person {
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

export interface PlaceIndexEntry {
  id: string
  name: string
  type?: string
  verseCount: number
  lat?: number
  lon?: number
  aliases?: string[]
  shard: string
}
export interface Place {
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

export interface BibleEvent {
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

/** ordinal -> [personIds, placeIds] */
export type VerseEntities = Record<number, [string[], string[]]>
/** ordinal -> [[toStart, toEnd, votes], ...] sorted by votes */
export type XrefTable = Record<number, [number, number, number][]>

export interface TopicIndexEntry {
  id: string
  title: string
  source: string
  entries: number
  verses: number
  shard: string
}
export interface Topic {
  id: string
  title: string
  source: string
  seeAlso: string[]
  entries: { text: string; refs: Range[] }[]
}

export interface StudyLink {
  ranges: Range[]
  label: string
  /** the theme this link belongs to; links sharing a topic form one branch on the map */
  topic?: string
  note?: string
  category?: string
  jesus: boolean
}
export interface StudyRef {
  label: string
  ranges: Range[]
  verses: number
  weight: number
  jesus: boolean
  note?: string
  /** for connection studies: the passage this reference points to (e.g. the NT fulfilment) */
  to?: Range[]
  toLabel?: string
  category?: string
  /** every passage this reference is linked to, including `to` */
  links?: StudyLink[]
}
export interface StudyCategory {
  id: string
  title: string
  note?: string
}
export interface StudyGroup {
  id: string
  title: string
  note?: string
  refs: StudyRef[]
  weight: number
  verses: number
}
export interface StudyView {
  id: string
  title: string
  note?: string
  groups: StudyGroup[]
}
export interface Study {
  id: string
  title: string
  subtitle?: string
  summary?: string
  tags: string[]
  /** "connections" when references link two passages (drawn as arcs) */
  kind?: string
  /** which chart to open with: map, arcs or sunburst */
  chart?: string
  categories?: StudyCategory[]
  views: StudyView[]
  ranges: Range[]
  refCount: number
  verseCount: number
}
export interface StudyIndexEntry {
  id: string
  title: string
  subtitle?: string
  tags: string[]
  kind?: string
  chart?: string
  refCount: number
  verseCount: number
}

export interface Manifest {
  generatedAt: string
  verses: number
  people: number
  places: number
  events: number
  sources: { id: string; name: string; license: string; url: string }[]
}
