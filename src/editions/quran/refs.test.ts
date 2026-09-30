import { describe, expect, it } from 'vitest'
import { BOOKS } from './books'
import { QURAN_BARE_REF, QURAN_REFS } from './refs'
import { Canon } from '@/lib/canon'
import { parseRefs, type Range } from '@/lib/refs'

// The verse counts of the 114 surahs in the standard (Kufan) numbering.
const VERSES = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19,
  5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]
const canon = new Canon(
  BOOKS,
  VERSES.map((n) => [n]),
  QURAN_REFS,
)
const at = (s: number, v: number) => canon.book(s).start + v - 1
const one = (input: string) => {
  const r = parseRefs(input, canon)
  expect(r.errors).toEqual([])
  return r.ranges
}
const label = (r: Range, style: 'name' | 'short' = 'short') => canon.rangeLabel(r[0], r[1], style)

describe('the Quran grid', () => {
  it('has 114 surahs and 6,236 verses', () => {
    expect(canon.books.length).toBe(114)
    expect(canon.total).toBe(6236)
  })
})

describe('Quran references', () => {
  it('parses a verse, with or without a prefix or a name', () => {
    for (const s of ['2:255', '2.255', 'Q 2:255', 'Q2:255', 'Quran 2:255', 'Al-Baqarah 255', 'Baqarah 2:255', 'Q.2.255']) expect(one(s)).toEqual([[at(2, 255), at(2, 255)]])
  })

  it('parses ranges within a surah and across surahs', () => {
    expect(label(one('2:255-257')[0])).toBe('2:255–257')
    expect(label(one('2:255-257')[0], 'name')).toBe('Al-Baqarah 2:255–257')
    expect(one('2:285-3:5')).toEqual([[at(2, 285), at(3, 5)]])
    expect(one('Q.2.255-Q.2.257')).toEqual([[at(2, 255), at(2, 257)]])
  })

  it('reads a bare number as a whole surah', () => {
    expect(label(one('112')[0])).toBe('Surah 112')
    expect(label(one('112')[0], 'name')).toBe('Surah 112 (Al-Ikhlas)')
    expect(label(one('113-114')[0])).toBe('Surahs 113–114')
    expect(one('Surah 2 (Al-Baqarah)')).toEqual([[at(2, 1), at(2, 286)]])
  })

  it('keeps the surah after a comma and starts over after a semicolon', () => {
    expect(one('2:255, 285-286')).toEqual([
      [at(2, 255), at(2, 255)],
      [at(2, 285), at(2, 286)],
    ])
    expect(one('2:255; 3')).toEqual([
      [at(2, 255), at(2, 255)],
      [at(3, 1), at(3, 200)],
    ])
  })

  it('clamps a verse past the end of a surah and reports it', () => {
    const r = parseRefs('1:9', canon)
    expect(r.ranges).toEqual([[at(1, 7), at(1, 7)]])
    expect(r.errors.length).toBe(1)
  })

  it('reports what it cannot read', () => {
    expect(parseRefs('115:1', canon).errors.length).toBe(1)
    expect(parseRefs('Nowhere 3', canon).errors.length).toBe(1)
    expect(parseRefs('Al-Baqarah 3:5', canon).errors.length).toBe(1)
  })

  it('writes URL ids that read back the same', () => {
    const o = at(2, 255)
    expect(canon.osis(o)).toBe('Q.2.255')
    expect(one(canon.osis(o))).toEqual([[o, o]])
  })

  it('finds references in running text', () => {
    const text = 'See 2:255 and 4:157-158, and Surah 112.'
    expect(text.match(QURAN_BARE_REF)).toEqual(['2:255', '4:157-158', 'Surah 112'])
  })
})
