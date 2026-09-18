import { describe, expect, it } from 'vitest'
import { durationYears, formatDuration, formatYear, formatYearRange, truncate } from './format'

describe('format helpers', () => {
  it('formats years as BC/AD', () => {
    expect(formatYear(-1085)).toBe('1085 BC')
    expect(formatYear(30)).toBe('AD 30')
    expect(formatYearRange(-1085, -1015)).toBe('1085–1015 BC')
    expect(formatYearRange(-4, 30)).toBe('4 BC – AD 30')
  })
  it('parses durations into years', () => {
    expect(durationYears('390Y')).toBe(390)
    expect(durationYears('2.5Y')).toBe(2.5)
    expect(durationYears('19M')).toBeCloseTo(19 / 12)
    expect(durationYears('8D')).toBeCloseTo(8 / 365)
    expect(durationYears('1W')).toBeCloseTo(7 / 365)
    expect(durationYears(undefined)).toBeUndefined()
    expect(formatDuration('8D')).toBe('8 days')
    expect(formatDuration('1Y')).toBe('1 year')
  })
  it('truncates on a word boundary', () => {
    expect(truncate('The quick brown fox jumps', 12)).toBe('The quick…')
    expect(truncate('short', 12)).toBe('short')
  })
})
