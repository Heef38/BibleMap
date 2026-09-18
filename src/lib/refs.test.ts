import { describe, expect, it } from 'vitest'
import { BOOKS, Canon } from './canon'
import { mergeRanges, parseRefs } from './refs'

// A synthetic grid: every book has 3 chapters of 10 verses, single-chapter books have 25.
const SINGLE = new Set(['Obad', 'Phlm', '2John', '3John', 'Jude'])
const canon = new Canon(BOOKS.map((b) => (SINGLE.has(b.osis) ? [25] : [10, 10, 10])))
const gen = canon.book(1)
const john = canon.find('John')!

const label = (r: [number, number]) => canon.rangeLabel(r[0], r[1])

describe('parseRefs', () => {
  it('parses a single verse in several spellings', () => {
    for (const s of ['John 3:6', 'Jn 3.6', 'John.3.6', 'JHN 3:6', 'john 3 : 6']) {
      const r = parseRefs(s, canon)
      expect(r.errors).toEqual([])
      expect(r.ranges).toEqual([[john.start + 25, john.start + 25]])
    }
  })

  it('parses verse ranges, chapter ranges and whole chapters', () => {
    expect(label(parseRefs('Gen 1:2-4', canon).ranges[0])).toBe('Genesis 1:2–4')
    expect(label(parseRefs('Gen 1:9-2:3', canon).ranges[0])).toBe('Genesis 1:9–2:3')
    expect(label(parseRefs('Gen 2', canon).ranges[0])).toBe('Genesis 2')
    expect(label(parseRefs('Gen 1-2', canon).ranges[0])).toBe('Genesis 1–2')
    expect(parseRefs('Genesis', canon).ranges[0]).toEqual([gen.start, gen.start + 29])
  })

  it('keeps chapter context across commas and resets it at semicolons', () => {
    const r = parseRefs('Matt 2:4-6, 8; 3:1; 2', canon)
    expect(r.errors).toEqual([])
    expect(r.ranges.map(label)).toEqual(['Matthew 2:4–6', 'Matthew 2:8', 'Matthew 3:1', 'Matthew 2'])
  })

  it('treats a bare number in a one-chapter book as a verse', () => {
    expect(label(parseRefs('Jude 3', canon).ranges[0])).toBe('Jude 3')
    expect(label(parseRefs('Jude 3-5', canon).ranges[0])).toBe('Jude 3–5')
    expect(label(parseRefs('Obad 1:10', canon).ranges[0])).toBe('Obadiah 10')
  })

  it('parses OSIS ranges with a repeated book', () => {
    const r = parseRefs('Prov.2.2-Prov.3.3', canon)
    expect(label(r.ranges[0])).toBe('Proverbs 2:2–3:3')
  })

  it('understands numbered books and roman numerals', () => {
    for (const s of ['1 Sam 2:1', '1Sam 2:1', 'I Samuel 2:1', '1 Samuel 2:1', 'First Samuel 2:1']) {
      expect(canon.locate(parseRefs(s, canon).ranges[0][0]).b).toBe(9)
    }
    expect(canon.locate(parseRefs('Isaiah 2:1', canon).ranges[0][0]).b).toBe(23)
    expect(canon.locate(parseRefs('III John 4', canon).ranges[0][0]).b).toBe(64)
  })

  it('clamps out-of-range verses and reports them', () => {
    const r = parseRefs('Gen 1:40', canon)
    expect(r.ranges[0]).toEqual([gen.start + 9, gen.start + 9])
    expect(r.errors.length).toBe(1)
  })

  it('reports unknown books', () => {
    const r = parseRefs('Hezekiah 3:1', canon)
    expect(r.ranges).toEqual([])
    expect(r.errors[0]).toMatch(/unknown book/)
  })
})

describe('mergeRanges', () => {
  it('merges overlapping and touching ranges', () => {
    expect(mergeRanges([[5, 7], [1, 2], [3, 4], [10, 12], [11, 15]])).toEqual([[1, 7], [10, 15]])
  })
})

describe('Canon', () => {
  it('round-trips ordinals', () => {
    for (const o of [0, 1, 29, 30, canon.total - 1]) {
      const { b, c, v } = canon.locate(o)
      expect(canon.ordinal(b, c, v)).toBe(o)
    }
  })
  it('labels psalms in the singular', () => {
    const ps = canon.find('Psalms')!
    expect(canon.rangeLabel(ps.start, ps.start + 9)).toBe('Psalm 1')
    expect(canon.rangeLabel(ps.start + 3, ps.start + 3)).toBe('Psalm 1:4')
  })
})
