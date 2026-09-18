import type { Canon, CanonBook } from './canon'

/** Inclusive ordinal range. */
export type Range = [start: number, end: number]

export interface ParseResult {
  ranges: Range[]
  errors: string[]
}

const PIECE =
  /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)?\s*(?:(\d+)\s*(?:[:.]\s*(\d+))?)?\s*(?:[-–—]\s*(?:((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s*)?(\d+)\s*(?:[:.]\s*(\d+))?)?\s*$/

/**
 * Parse a human or OSIS reference list into ordinal ranges.
 * Handles "John 3:16", "Matt 13:24-30, 36-43; 6:9", "Ps 2", "Jude 3", "Gen.1.1-Gen.2.3",
 * "Prov.8.22-Prov.8.30" and "1 Cor 15:20–28". Semicolons reset the chapter context;
 * commas keep it. Out-of-range verses are clamped and reported.
 */
export function parseRefs(input: string, canon: Canon): ParseResult {
  const ranges: Range[] = []
  const errors: string[] = []
  let ctxBook: CanonBook | undefined
  let ctxChapter: number | undefined

  const clampVerse = (book: CanonBook, c: number, v: number, raw: string): number => {
    const n = book.chapters[c - 1]
    if (v > n) {
      errors.push(`${raw}: ${book.name} ${c} has ${n} verses, clamped ${v}`)
      return n
    }
    return v
  }

  for (const segment of input.split(';')) {
    ctxChapter = undefined
    for (const rawPiece of segment.split(',')) {
      const raw = rawPiece.trim()
      if (!raw) continue
      const m = PIECE.exec(raw)
      if (!m) {
        errors.push(`${raw}: unrecognized reference`)
        continue
      }
      const [, bookName, n1, n2, endBookName, e1, e2] = m
      let book = ctxBook
      if (bookName) {
        const found = canon.find(bookName)
        if (!found) {
          errors.push(`${raw}: unknown book "${bookName.trim()}"`)
          continue
        }
        book = found
        ctxBook = found
        ctxChapter = undefined
      }
      if (!book) {
        errors.push(`${raw}: no book given`)
        continue
      }
      const single = book.chapters.length === 1

      let startC: number
      let startV: number | undefined
      if (n1 === undefined) {
        // whole book
        if (bookName && !e1) {
          ranges.push([book.start, book.start + book.verseCount - 1])
          continue
        }
        errors.push(`${raw}: missing chapter`)
        continue
      }
      const a = parseInt(n1, 10)
      if (n2 !== undefined) {
        startC = a
        startV = parseInt(n2, 10)
      } else if (single) {
        startC = 1
        startV = a
      } else if (ctxChapter !== undefined && !bookName) {
        startC = ctxChapter
        startV = a
      } else {
        startC = a
        startV = undefined
      }
      if (startC < 1 || startC > book.chapters.length) {
        errors.push(`${raw}: ${book.name} has ${book.chapters.length} chapters`)
        continue
      }
      ctxChapter = startC
      if (startV !== undefined) startV = Math.max(1, clampVerse(book, startC, startV, raw))

      let endBook = book
      if (endBookName) {
        const found = canon.find(endBookName)
        if (!found) {
          errors.push(`${raw}: unknown book "${endBookName.trim()}"`)
          continue
        }
        endBook = found
      }

      const startOrd = startV === undefined ? canon.chapterStart(book.n, startC) : canon.ordinal(book.n, startC, startV)
      let endOrd: number
      if (e1 === undefined) {
        endOrd = startV === undefined ? canon.chapterEnd(book.n, startC) : startOrd
      } else {
        const x = parseInt(e1, 10)
        if (e2 !== undefined) {
          const ec = x
          if (ec < 1 || ec > endBook.chapters.length) {
            errors.push(`${raw}: ${endBook.name} has ${endBook.chapters.length} chapters`)
            continue
          }
          const ev = clampVerse(endBook, ec, parseInt(e2, 10), raw)
          endOrd = canon.ordinal(endBook.n, ec, ev)
          ctxChapter = ec
        } else if (startV !== undefined || (single && !endBookName)) {
          // verse range within the start chapter
          const ec = single ? 1 : startC
          const ev = clampVerse(endBook, ec, x, raw)
          endOrd = canon.ordinal(endBook.n, ec, ev)
        } else {
          // chapter range
          if (x < 1 || x > endBook.chapters.length) {
            errors.push(`${raw}: ${endBook.name} has ${endBook.chapters.length} chapters`)
            continue
          }
          endOrd = canon.chapterEnd(endBook.n, x)
          ctxChapter = x
        }
      }
      if (startOrd < 0 || endOrd < 0) {
        errors.push(`${raw}: off the verse grid`)
        continue
      }
      ranges.push(startOrd <= endOrd ? [startOrd, endOrd] : [endOrd, startOrd])
    }
  }
  return { ranges, errors }
}

/** Sort and merge overlapping or touching ranges. */
export function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out: Range[] = [sorted[0].slice() as Range]
  for (let i = 1; i < sorted.length; i++) {
    const cur = out[out.length - 1]
    const [s, e] = sorted[i]
    if (s <= cur[1] + 1) cur[1] = Math.max(cur[1], e)
    else out.push([s, e])
  }
  return out
}

export function countVerses(ranges: Range[]): number {
  let n = 0
  for (const [s, e] of ranges) n += e - s + 1
  return n
}

export function* ordinalsOf(ranges: Range[]): Generator<number> {
  for (const [s, e] of ranges) for (let o = s; o <= e; o++) yield o
}

export function rangesContain(ranges: Range[], o: number): boolean {
  for (const [s, e] of ranges) if (o >= s && o <= e) return true
  return false
}

/** Parse the compact URL form produced by Canon.rangeOsis(): "John.3.16-John.3.18". */
export function parseRangeParam(param: string, canon: Canon): Range | null {
  const r = parseRefs(param, canon)
  return r.ranges.length ? r.ranges[0] : null
}

/** Turn a sorted list of ordinals into merged inclusive ranges. */
export function ordinalsToRanges(ordinals: number[]): Range[] {
  const out: Range[] = []
  for (const o of ordinals) {
    const last = out[out.length - 1]
    if (last && o === last[1] + 1) last[1] = o
    else if (last && o <= last[1]) continue
    else out.push([o, o])
  }
  return out
}
