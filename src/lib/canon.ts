/**
 * The Protestant canon: 66 books in traditional order, with every spelling the
 * data sources and users are likely to throw at us. Chapter/verse counts are not
 * hard-coded here; they come from the data build (books.json) so the app and the
 * pipeline always agree on the 31,102-verse grid.
 */
export type Testament = 'OT' | 'NT'

export interface BookMeta {
  /** 1-based position in the canon */
  n: number
  /** OSIS id, e.g. "Gen", "1Sam", "Phlm" */
  osis: string
  /** USFM / Paratext code, e.g. "GEN", "1SA", "PHM" */
  usfm: string
  name: string
  /** Short label for tight spaces */
  short: string
  testament: Testament
  division: string
  aliases: string[]
}

type Row = [string, string, string, string, Testament, string, string]

const ROWS: Row[] = [
  ['Gen', 'GEN', 'Genesis', 'Gen', 'OT', 'Law', 'ge gn'],
  ['Exod', 'EXO', 'Exodus', 'Exod', 'OT', 'Law', 'ex exo'],
  ['Lev', 'LEV', 'Leviticus', 'Lev', 'OT', 'Law', 'le lv'],
  ['Num', 'NUM', 'Numbers', 'Num', 'OT', 'Law', 'nu nm nb'],
  ['Deut', 'DEU', 'Deuteronomy', 'Deut', 'OT', 'Law', 'de dt'],
  ['Josh', 'JOS', 'Joshua', 'Josh', 'OT', 'History', 'jsh'],
  ['Judg', 'JDG', 'Judges', 'Judg', 'OT', 'History', 'jg jgs jdgs'],
  ['Ruth', 'RUT', 'Ruth', 'Ruth', 'OT', 'History', 'ru rth'],
  ['1Sam', '1SA', '1 Samuel', '1 Sam', 'OT', 'History', '1sm 1s 1samuel'],
  ['2Sam', '2SA', '2 Samuel', '2 Sam', 'OT', 'History', '2sm 2s 2samuel'],
  ['1Kgs', '1KI', '1 Kings', '1 Kgs', 'OT', 'History', '1kg 1kin 1kings'],
  ['2Kgs', '2KI', '2 Kings', '2 Kgs', 'OT', 'History', '2kg 2kin 2kings'],
  ['1Chr', '1CH', '1 Chronicles', '1 Chr', 'OT', 'History', '1chron 1chronicles'],
  ['2Chr', '2CH', '2 Chronicles', '2 Chr', 'OT', 'History', '2chron 2chronicles'],
  ['Ezra', 'EZR', 'Ezra', 'Ezra', 'OT', 'History', ''],
  ['Neh', 'NEH', 'Nehemiah', 'Neh', 'OT', 'History', 'ne'],
  ['Esth', 'EST', 'Esther', 'Esth', 'OT', 'History', 'es'],
  ['Job', 'JOB', 'Job', 'Job', 'OT', 'Poetry & Wisdom', 'jb'],
  ['Ps', 'PSA', 'Psalms', 'Ps', 'OT', 'Poetry & Wisdom', 'psa psm pss psalm pslm'],
  ['Prov', 'PRO', 'Proverbs', 'Prov', 'OT', 'Poetry & Wisdom', 'pr prv'],
  ['Eccl', 'ECC', 'Ecclesiastes', 'Eccl', 'OT', 'Poetry & Wisdom', 'ec eccles qoh qoheleth'],
  ['Song', 'SNG', 'Song of Solomon', 'Song', 'OT', 'Poetry & Wisdom', 'so sos ss songofsongs cant canticles canticle'],
  ['Isa', 'ISA', 'Isaiah', 'Isa', 'OT', 'Major Prophets', 'is'],
  ['Jer', 'JER', 'Jeremiah', 'Jer', 'OT', 'Major Prophets', 'je jr'],
  ['Lam', 'LAM', 'Lamentations', 'Lam', 'OT', 'Major Prophets', 'la'],
  ['Ezek', 'EZK', 'Ezekiel', 'Ezek', 'OT', 'Major Prophets', 'eze'],
  ['Dan', 'DAN', 'Daniel', 'Dan', 'OT', 'Major Prophets', 'da dn'],
  ['Hos', 'HOS', 'Hosea', 'Hos', 'OT', 'Minor Prophets', 'ho'],
  ['Joel', 'JOL', 'Joel', 'Joel', 'OT', 'Minor Prophets', 'joe jl'],
  ['Amos', 'AMO', 'Amos', 'Amos', 'OT', 'Minor Prophets', 'am'],
  ['Obad', 'OBA', 'Obadiah', 'Obad', 'OT', 'Minor Prophets', 'ob'],
  ['Jonah', 'JON', 'Jonah', 'Jonah', 'OT', 'Minor Prophets', 'jnh'],
  ['Mic', 'MIC', 'Micah', 'Mic', 'OT', 'Minor Prophets', 'mi'],
  ['Nah', 'NAM', 'Nahum', 'Nah', 'OT', 'Minor Prophets', 'na'],
  ['Hab', 'HAB', 'Habakkuk', 'Hab', 'OT', 'Minor Prophets', 'hb'],
  ['Zeph', 'ZEP', 'Zephaniah', 'Zeph', 'OT', 'Minor Prophets', 'zp'],
  ['Hag', 'HAG', 'Haggai', 'Hag', 'OT', 'Minor Prophets', 'hg'],
  ['Zech', 'ZEC', 'Zechariah', 'Zech', 'OT', 'Minor Prophets', 'zc'],
  ['Mal', 'MAL', 'Malachi', 'Mal', 'OT', 'Minor Prophets', 'ml'],
  ['Matt', 'MAT', 'Matthew', 'Matt', 'NT', 'Gospels', 'mt'],
  ['Mark', 'MRK', 'Mark', 'Mark', 'NT', 'Gospels', 'mk mr'],
  ['Luke', 'LUK', 'Luke', 'Luke', 'NT', 'Gospels', 'lk lu'],
  ['John', 'JHN', 'John', 'John', 'NT', 'Gospels', 'jn joh'],
  ['Acts', 'ACT', 'Acts', 'Acts', 'NT', 'Acts', 'ac'],
  ['Rom', 'ROM', 'Romans', 'Rom', 'NT', 'Pauline Epistles', 'ro rm'],
  ['1Cor', '1CO', '1 Corinthians', '1 Cor', 'NT', 'Pauline Epistles', '1corinthians'],
  ['2Cor', '2CO', '2 Corinthians', '2 Cor', 'NT', 'Pauline Epistles', '2corinthians'],
  ['Gal', 'GAL', 'Galatians', 'Gal', 'NT', 'Pauline Epistles', 'ga'],
  ['Eph', 'EPH', 'Ephesians', 'Eph', 'NT', 'Pauline Epistles', 'ep'],
  ['Phil', 'PHP', 'Philippians', 'Phil', 'NT', 'Pauline Epistles', 'phi pp philip'],
  ['Col', 'COL', 'Colossians', 'Col', 'NT', 'Pauline Epistles', 'co'],
  ['1Thess', '1TH', '1 Thessalonians', '1 Thess', 'NT', 'Pauline Epistles', '1thes 1thessalonians'],
  ['2Thess', '2TH', '2 Thessalonians', '2 Thess', 'NT', 'Pauline Epistles', '2thes 2thessalonians'],
  ['1Tim', '1TI', '1 Timothy', '1 Tim', 'NT', 'Pauline Epistles', '1tm 1timothy'],
  ['2Tim', '2TI', '2 Timothy', '2 Tim', 'NT', 'Pauline Epistles', '2tm 2timothy'],
  ['Titus', 'TIT', 'Titus', 'Titus', 'NT', 'Pauline Epistles', 'ti'],
  ['Phlm', 'PHM', 'Philemon', 'Phlm', 'NT', 'Pauline Epistles', 'philem pm'],
  ['Heb', 'HEB', 'Hebrews', 'Heb', 'NT', 'General Epistles', ''],
  ['Jas', 'JAS', 'James', 'Jas', 'NT', 'General Epistles', 'jm jam'],
  ['1Pet', '1PE', '1 Peter', '1 Pet', 'NT', 'General Epistles', '1pt 1peter'],
  ['2Pet', '2PE', '2 Peter', '2 Pet', 'NT', 'General Epistles', '2pt 2peter'],
  ['1John', '1JN', '1 John', '1 John', 'NT', 'General Epistles', '1jo 1jhn'],
  ['2John', '2JN', '2 John', '2 John', 'NT', 'General Epistles', '2jo 2jhn'],
  ['3John', '3JN', '3 John', '3 John', 'NT', 'General Epistles', '3jo 3jhn'],
  ['Jude', 'JUD', 'Jude', 'Jude', 'NT', 'General Epistles', 'jd'],
  ['Rev', 'REV', 'Revelation', 'Rev', 'NT', 'Revelation', 're revelations apoc apocalypse revelationofjohn'],
]

export const BOOKS: readonly BookMeta[] = ROWS.map((r, i) => ({
  n: i + 1,
  osis: r[0],
  usfm: r[1],
  name: r[2],
  short: r[3],
  testament: r[4],
  division: r[5],
  aliases: r[6].split(' ').filter(Boolean),
}))

/** Normalize a book name for lookup: "I Sam." -> "1sam", "Song of Songs" -> "songofsongs". */
export function normalizeBookName(s: string): string {
  let t = s.trim().toLowerCase()
  t = t.replace(/^(iii|ii|i)\s+/, (_, r: string) => `${r.length} `)
  t = t.replace(/^(1st|2nd|3rd|first|second|third)\s+/, (_, w: string) =>
    w.startsWith('1') || w === 'first' ? '1 ' : w.startsWith('2') || w === 'second' ? '2 ' : '3 ',
  )
  return t.replace(/[^a-z0-9]/g, '')
}

const ALIAS_INDEX: Map<string, BookMeta> = (() => {
  const m = new Map<string, BookMeta>()
  for (const b of BOOKS) {
    for (const a of [b.osis, b.usfm, b.name, b.short, ...b.aliases]) {
      const k = normalizeBookName(a)
      if (k && !m.has(k)) m.set(k, b)
    }
  }
  return m
})()

export function findBookMeta(name: string): BookMeta | undefined {
  return ALIAS_INDEX.get(normalizeBookName(name))
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
 * The verse grid. Every verse in the Bible has an ordinal 0..total-1 in canonical
 * order; everything in the data files refers to verses by that ordinal.
 */
export class Canon {
  readonly books: CanonBook[]
  readonly total: number
  private readonly starts: number[]

  constructor(chaptersByBook: number[][]) {
    if (chaptersByBook.length !== BOOKS.length) {
      throw new Error(`Canon expects ${BOOKS.length} books, got ${chaptersByBook.length}`)
    }
    let ordinal = 0
    this.books = BOOKS.map((meta, i) => {
      const chapters = chaptersByBook[i]
      const chapterStarts: number[] = []
      let o = ordinal
      for (const n of chapters) {
        chapterStarts.push(o)
        o += n
      }
      const book: CanonBook = { ...meta, chapters, start: ordinal, verseCount: o - ordinal, chapterStarts }
      ordinal = o
      return book
    })
    this.total = ordinal
    this.starts = this.books.map((b) => b.start)
  }

  static fromJson(j: BooksJson): Canon {
    const sorted = [...j.books].sort((a, b) => a.n - b.n)
    return new Canon(sorted.map((b) => b.chapters))
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
    const meta = findBookMeta(name)
    return meta ? this.books[meta.n - 1] : undefined
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
    const { b, c, v } = this.locate(o)
    return `${this.books[b - 1].osis}.${c}.${v}`
  }

  label(o: number, style: 'name' | 'short' = 'name'): string {
    const { b, c, v } = this.locate(o)
    const book = this.books[b - 1]
    const single = book.chapters.length === 1
    return single ? `${book[style]} ${v}` : `${book[style]} ${c}:${v}`
  }

  /** "John 3:16", "John 3:16–18", "John 3:16–4:2", "Psalm 23", "Genesis 1–2" */
  rangeLabel(start: number, end: number, style: 'name' | 'short' = 'name'): string {
    if (end < start) [start, end] = [end, start]
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
