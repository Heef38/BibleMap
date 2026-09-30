import type { ParseResult } from './refs'

/**
 * The verse grid of a scripture. The books themselves (the 66 of the Bible, the 114 surahs of the
 * Quran) come from the edition in src/editions, with every spelling of their names. Chapter and
 * verse counts are not hard-coded; they come from the data build (books.json), so the app and the
 * pipeline always agree on the grid.
 */
export interface BookMeta {
  /** 1-based position in the canon */
  n: number
  /** OSIS id, e.g. "Gen", "1Sam", "Phlm" (a surah's number in the Quran) */
  osis: string
  /** USFM / Paratext code, e.g. "GEN", "1SA", "PHM" */
  usfm: string
  name: string
  /** Short label for tight spaces */
  short: string
  /** which of the edition's groups the book is in: a Testament, or where a surah was revealed */
  group: string
  division: string
  aliases: string[]
}

/**
 * How a scripture writes its references, when it is not the Bible's book, chapter and verse:
 * the Quran counts surah and verse ("2:255"). An edition without one gets the Bible's way.
 */
export interface RefScheme {
  /** the id used in URLs: a book or prefix, then chapter and verse, joined by dots */
  osis(canon: Canon, o: number): string
  label(canon: Canon, o: number, style: 'name' | 'short'): string
  rangeLabel(canon: Canon, start: number, end: number, style: 'name' | 'short'): string
  parse(input: string, canon: Canon): ParseResult
}

/** Normalize a book name for lookup: "I Sam." -> "1sam", "Song of Songs" -> "songofsongs". */
export function normalizeBookName(s: string): string {
  let t = s.trim().toLowerCase()
  t = t.replace(/^(iii|ii|i)\s+/, (_, r: string) => `${r.length} `)
  t = t.replace(/^(1st|2nd|3rd|first|second|third)\s+/, (_, w: string) =>
    w.startsWith('1') || w === 'first' ? '1 ' : w.startsWith('2') || w === 'second' ? '2 ' : '3 ',
  )
  return t.replace(/[^a-z0-9]/g, '')
}

export interface CanonBook extends BookMeta {
  /** verse count per chapter, index 0 = chapter 1 */
  chapters: number[]
  /** ordinal of the book's first verse */
  start: number
  verseCount: number
  /** ordinal of the first verse of each chapter */
  chapterStarts: number[]
}

export interface BooksJson {
  total: number
  books: { n: number; chapters: number[] }[]
}

export interface VerseLoc {
  b: number
  c: number
  v: number
}

/**
 * The verse grid. Every verse has an ordinal 0..total-1 in canonical order; everything in the
 * data files refers to verses by that ordinal.
 */
export class Canon {
  readonly books: CanonBook[]
  readonly total: number
  private readonly starts: number[]
  private readonly aliases = new Map<string, number>()

  constructor(
    meta: readonly BookMeta[],
    chaptersByBook: number[][],
    readonly scheme?: RefScheme,
  ) {
    if (chaptersByBook.length !== meta.length) {
      throw new Error(`Canon expects ${meta.length} books, got ${chaptersByBook.length}`)
    }
    for (const b of meta) {
      for (const a of [b.osis, b.usfm, b.name, b.short, ...b.aliases]) {
        const k = normalizeBookName(a)
        if (k && !this.aliases.has(k)) this.aliases.set(k, b.n)
      }
    }
    let ordinal = 0
    this.books = meta.map((m, i) => {
      const chapters = chaptersByBook[i]
      const chapterStarts: number[] = []
      let o = ordinal
      for (const n of chapters) {
        chapterStarts.push(o)
        o += n
      }
      const book: CanonBook = { ...m, chapters, start: ordinal, verseCount: o - ordinal, chapterStarts }
      ordinal = o
      return book
    })
    this.total = ordinal
    this.starts = this.books.map((b) => b.start)
  }

  static fromJson(meta: readonly BookMeta[], j: BooksJson, scheme?: RefScheme): Canon {
    const sorted = [...j.books].sort((a, b) => a.n - b.n)
    return new Canon(
      meta,
      sorted.map((b) => b.chapters),
      scheme,
    )
  }

  toJson(): BooksJson {
    return { total: this.total, books: this.books.map((b) => ({ n: b.n, chapters: b.chapters })) }
  }

  book(n: number): CanonBook {
    const b = this.books[n - 1]
    if (!b) throw new Error(`No book ${n}`)
    return b
  }

  find(name: string): CanonBook | undefined {
    const n = this.aliases.get(normalizeBookName(name))
    return n ? this.books[n - 1] : undefined
  }

  byOsis(osis: string): CanonBook | undefined {
    return this.find(osis)
  }

  /** Ordinal of book/chapter/verse, or -1 when the reference is off the grid. */
  ordinal(b: number, c: number, v: number): number {
    const book = this.books[b - 1]
    if (!book) return -1
    const n = book.chapters[c - 1]
    if (n === undefined || v < 1 || v > n) return -1
    return book.chapterStarts[c - 1] + v - 1
  }

  locate(o: number): VerseLoc {
    if (o < 0 || o >= this.total) throw new Error(`Ordinal ${o} out of range`)
    let lo = 0
    let hi = this.starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.starts[mid] <= o) lo = mid
      else hi = mid - 1
    }
    const book = this.books[lo]
    let c = 0
    let hiC = book.chapterStarts.length - 1
    while (c < hiC) {
      const mid = (c + hiC + 1) >> 1
      if (book.chapterStarts[mid] <= o) c = mid
      else hiC = mid - 1
    }
    return { b: book.n, c: c + 1, v: o - book.chapterStarts[c] + 1 }
  }

  chapterStart(b: number, c: number): number {
    return this.book(b).chapterStarts[c - 1]
  }

  chapterEnd(b: number, c: number): number {
    const book = this.book(b)
    return book.chapterStarts[c - 1] + book.chapters[c - 1] - 1
  }

  bookEnd(b: number): number {
    const book = this.book(b)
    return book.start + book.verseCount - 1
  }

  osis(o: number): string {
    if (this.scheme) return this.scheme.osis(this, o)
    const { b, c, v } = this.locate(o)
    return `${this.books[b - 1].osis}.${c}.${v}`
  }

  label(o: number, style: 'name' | 'short' = 'name'): string {
    if (this.scheme) return this.scheme.label(this, o, style)
    const { b, c, v } = this.locate(o)
    const book = this.books[b - 1]
    const single = book.chapters.length === 1
    return single ? `${book[style]} ${v}` : `${book[style]} ${c}:${v}`
  }

  /** "John 3:16", "John 3:16–18", "John 3:16–4:2", "Psalm 23", "Genesis 1–2" */
  rangeLabel(start: number, end: number, style: 'name' | 'short' = 'name'): string {
    if (end < start) [start, end] = [end, start]
    if (this.scheme) return this.scheme.rangeLabel(this, start, end, style)
    const a = this.locate(start)
    const z = this.locate(end)
    const book = this.books[a.b - 1]
    const bookName = style === 'name' && book.osis === 'Ps' ? 'Psalm' : book[style]
    if (a.b !== z.b) return `${this.label(start, style)}–${this.label(end, style)}`
    const single = book.chapters.length === 1
    const wholeChapters =
      a.v === 1 && z.v === book.chapters[z.c - 1]
    if (single) {
      if (a.v === 1 && z.v === book.chapters[0]) return bookName
      return a.v === z.v ? `${bookName} ${a.v}` : `${bookName} ${a.v}–${z.v}`
    }
    if (wholeChapters) {
      if (a.c === 1 && z.c === book.chapters.length) return bookName
      return a.c === z.c ? `${bookName} ${a.c}` : `${bookName} ${a.c}–${z.c}`
    }
    if (start === end) return `${bookName} ${a.c}:${a.v}`
    if (a.c === z.c) return `${bookName} ${a.c}:${a.v}–${z.v}`
    return `${bookName} ${a.c}:${a.v}–${z.c}:${z.v}`
  }

  /** OSIS-style id for a range, used in URLs: "John.3.16" or "John.3.16-John.3.18" */
  rangeOsis(start: number, end: number): string {
    return start === end ? this.osis(start) : `${this.osis(start)}-${this.osis(end)}`
  }
}
