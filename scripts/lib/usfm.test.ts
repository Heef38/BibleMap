import { describe, expect, it } from 'vitest'
import { parseUsfm } from './usfm'

const SAMPLE = `\\id MAT Sample
\\h Matthew
\\c 3
\\s1 The Baptism of Jesus
\\r (\\ref Mark 1:9–11|MRK 1:9-11\\ref*)
\\p
\\v 13 Then Jesus came from Galilee\\f + \\fr 3:13 \\ft Or \\fqa the district\\f* to the Jordan.
\\p \\wj \\v 15 “Let it be so now,”\\wj* Jesus replied. \\wj “It is fitting for us.”\\wj* Then John permitted Him.
\\c 4
\\p
\\v 4 But he answered, \\wj “\\+w It|strong="G1161"\\+w* \\+w is|strong="G3588"\\+w* written.”\\wj*
\\q1
\\v 5 Line one
\\q2 line two.
\\v 6-7 Bridged verse.
`

describe('parseUsfm', () => {
  const book = parseUsfm(SAMPLE)
  const get = (c: number, v: number) => book.verses.find((x) => x.c === c && x.v === v)!

  it('reads the book code', () => {
    expect(book.code).toBe('MAT')
  })

  it('drops footnotes and keeps clean verse text', () => {
    expect(get(3, 13).text).toBe('Then Jesus came from Galilee to the Jordan.')
  })

  it('records words-of-Jesus spans, including a span opened before the verse marker', () => {
    const v = get(3, 15)
    expect(v.text).toBe('“Let it be so now,” Jesus replied. “It is fitting for us.” Then John permitted Him.')
    expect(v.wj.map(([a, b]) => v.text.slice(a, b))).toEqual(['“Let it be so now,”', '“It is fitting for us.”'])
  })

  it('strips word attributes while keeping the words', () => {
    const v = get(4, 4)
    expect(v.text).toBe('But he answered, “It is written.”')
    expect(v.wj.map(([a, b]) => v.text.slice(a, b))).toEqual(['“It is written.”'])
  })

  it('joins poetry lines with a space and handles verse bridges', () => {
    expect(get(4, 5).text).toBe('Line one line two.')
    expect(get(4, 6).text).toBe('Bridged verse.')
    expect(get(4, 7).text).toBe('')
  })

  it('attaches headings to the following verse', () => {
    expect(book.headings.get('3:13')).toBe('The Baptism of Jesus')
  })
})
