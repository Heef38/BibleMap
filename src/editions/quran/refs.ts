import type { Canon, CanonBook, RefScheme } from '@/lib/canon'
import type { ParseResult, Range } from '@/lib/refs'

/**
 * How the Quran is cited: by surah and verse, "2:255", with or without the surah's name or a
 * "Q" in front. In the verse grid every surah is a book of one chapter, so verse 255 of surah 2
 * is book 2, chapter 1, verse 255.
 */

// "Q", "Q.", "Quran", "Qur'an", "Surah", "Sura", "Surat", before a number or a name.
const PREFIX = /^(?:q(?:ur['’]?an)?(?![a-z])|s[uū]ra[ht]?(?![a-z])|surahs(?![a-z]))[.\s]*/i
const NUMBERS = /^(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?(?:\s*[-–—]\s*(?:([^\d]*?)\s*)?(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?)?$/

const verseOf = (canon: Canon, o: number) => {
  const { b, v } = canon.locate(o)
  return { s: b, v, book: canon.book(b) }
}

/**
 * Parse a reference list into ordinal ranges: "2:255", "2:255-257", "2:285-3:5", "112" (a whole
 * surah), "Al-Baqarah 255", "Q 2:255", "Q.2.255-Q.2.257" (the URL form). A comma keeps the surah
 * ("2:255, 285-286"); a semicolon starts over. Verses past the end of a surah are clamped and reported.
 */
function parse(input: string, canon: Canon): ParseResult {
  const ranges: Range[] = []
  const errors: string[] = []
  const surah = (n: number, raw: string): CanonBook | undefined => {
    if (n < 1 || n > canon.books.length) {
      errors.push(`${raw}: there are ${canon.books.length} surahs`)
      return undefined
    }
    return canon.book(n)
  }
  const verse = (book: CanonBook, v: number, raw: string): number => {
    if (v > book.verseCount) {
      errors.push(`${raw}: ${book.name} has ${book.verseCount} verses, clamped ${v}`)
      v = book.verseCount
    }
    return book.start + Math.max(1, v) - 1
  }

  for (const segment of input.split(';')) {
    let ctx: CanonBook | undefined
    for (const rawPiece of segment.split(',')) {
      const raw = rawPiece.trim()
      if (!raw) continue
      // "Surah 2 (Al-Baqarah)": the name in brackets is for the reader.
      let t = raw.replace(/\s*\([^)]*\)\s*$/, '').replace(PREFIX, '')
      const nameEnd = t.search(/\d/)
      const name = (nameEnd < 0 ? t : t.slice(0, nameEnd)).replace(/[\s.:,]+$/, '').trim()
      t = nameEnd < 0 ? '' : t.slice(nameEnd).trim()
      let named: CanonBook | undefined
      if (name) {
        named = canon.find(name)
        if (!named) {
          errors.push(`${raw}: unknown surah "${name}"`)
          continue
        }
      }
      if (!t) {
        if (!named) {
          errors.push(`${raw}: unrecognized reference`)
          continue
        }
        ranges.push([named.start, named.start + named.verseCount - 1])
        ctx = named
        continue
      }
      const m = NUMBERS.exec(t)
      if (!m) {
        errors.push(`${raw}: unrecognized reference`)
        continue
      }
      const n1 = parseInt(m[1], 10)
      const n2 = m[2] === undefined ? undefined : parseInt(m[2], 10)
      const endName = m[3]?.replace(PREFIX, '').replace(/[\s.:]+$/, '').trim()
      const e1 = m[4] === undefined ? undefined : parseInt(m[4], 10)
      const e2 = m[5] === undefined ? undefined : parseInt(m[5], 10)

      // Where it starts: a surah and, unless the whole surah is meant, a verse.
      let book: CanonBook | undefined
      let startV: number | undefined
      if (named) {
        if (n2 !== undefined) {
          if (n1 !== named.n) {
            errors.push(`${raw}: ${named.name} is surah ${named.n}, not ${n1}`)
            continue
          }
          startV = n2
        } else startV = n1
        book = named
      } else if (n2 !== undefined) {
        book = surah(n1, raw)
        startV = n2
      } else if (ctx) {
        book = ctx
        startV = n1
      } else book = surah(n1, raw)
      if (!book) continue

      let start: number
      let end: number
      if (startV === undefined) {
        // whole surahs: "112", "113-114"
        start = book.start
        let last = book
        if (e1 !== undefined) {
          if (e2 !== undefined) {
            errors.push(`${raw}: a range that starts with a whole surah ends with one`)
            continue
          }
          const z = surah(e1, raw)
          if (!z) continue
          last = z
        }
        end = last.start + last.verseCount - 1
        ctx = undefined
      } else {
        start = verse(book, startV, raw)
        end = start
        ctx = book
        if (e1 !== undefined) {
          let last: CanonBook | undefined = book
          if (e2 !== undefined) last = surah(e1, raw)
          else if (endName) {
            errors.push(`${raw}: unrecognized reference`)
            continue
          }
          if (!last) continue
          if (endName && e2 !== undefined && canon.find(endName)?.n !== last.n) {
            errors.push(`${raw}: unknown surah "${endName}"`)
            continue
          }
          end = verse(last, e2 ?? e1, raw)
          ctx = last
        }
      }
      ranges.push(start <= end ? [start, end] : [end, start])
    }
  }
  return { ranges, errors }
}

export const QURAN_REFS: RefScheme = {
  parse,
  // "Q.2.255": the Q stands where the Bible has a book, so a URL reads the same way in both.
  osis(canon, o) {
    const { s, v } = verseOf(canon, o)
    return `Q.${s}.${v}`
  },
  label(canon, o, style) {
    const { s, v, book } = verseOf(canon, o)
    return style === 'name' ? `${book.name} ${s}:${v}` : `${s}:${v}`
  },
  /** "Al-Baqarah 2:255", "2:255–257", "2:285–3:5", "Surah 112 (Al-Ikhlas)", "Surahs 113–114" */
  rangeLabel(canon, start, end, style) {
    const a = verseOf(canon, start)
    const z = verseOf(canon, end)
    const wholeSurahs = a.v === 1 && z.v === z.book.verseCount
    if (a.s === z.s) {
      if (wholeSurahs) return style === 'name' ? `Surah ${a.s} (${a.book.name})` : `Surah ${a.s}`
      const verses = a.v === z.v ? `${a.s}:${a.v}` : `${a.s}:${a.v}–${z.v}`
      return style === 'name' ? `${a.book.name} ${verses}` : verses
    }
    if (wholeSurahs) return `Surahs ${a.s}–${z.s}`
    return style === 'name' ? `${a.book.name} ${a.s}:${a.v} – ${z.book.name} ${z.s}:${z.v}` : `${a.s}:${a.v}–${z.s}:${z.v}`
  },
}

/** A reference in running text: "2:255", "2:255-257", "Q 2:255", "Quran 2:255", "Surah 112". */
export const QURAN_BARE_REF = /\b((?:(?:Q(?:ur['’]?an)?\.?|Surah)\s?)?\d{1,3}:\d{1,3}(?:\s?[-–]\s?\d{1,3}(?::\d{1,3})?)?|Surah\s\d{1,3})\b/g
