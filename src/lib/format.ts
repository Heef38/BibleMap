export function formatYear(y: number | null | undefined): string {
  if (y === null || y === undefined) return ''
  if (y < 0) return `${-y} BC`
  return `AD ${y}`
}

export function formatYearRange(a?: number | null, b?: number | null): string {
  if (a == null && b == null) return ''
  if (a != null && b != null) {
    if (a < 0 && b < 0) return `${-a}–${-b} BC`
    return `${formatYear(a)} – ${formatYear(b)}`
  }
  return formatYear(a ?? b)
}

export function formatCount(n: number, singular: string, plural = `${singular}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? singular : plural}`
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  const sp = cut.lastIndexOf(' ')
  return `${cut.slice(0, sp > n * 0.6 ? sp : n).trimEnd()}…`
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** "390Y", "8D", "19M", "1W", "2.5Y" -> years (fractional for short spans). */
export function durationYears(d?: string | null): number | undefined {
  if (!d) return undefined
  const m = /^(\d+(?:\.\d+)?)\s*([DWMY])$/i.exec(d.trim())
  if (!m) return undefined
  const n = parseFloat(m[1])
  switch (m[2].toUpperCase()) {
    case 'D':
      return n / 365
    case 'W':
      return (n * 7) / 365
    case 'M':
      return n / 12
    default:
      return n
  }
}

export function formatDuration(d?: string | null): string {
  if (!d) return ''
  const m = /^(\d+(?:\.\d+)?)\s*([DWMY])$/i.exec(d.trim())
  if (!m) return d
  const n = m[1]
  const unit = { D: 'day', W: 'week', M: 'month', Y: 'year' }[m[2].toUpperCase() as 'D' | 'W' | 'M' | 'Y']
  return `${n} ${unit}${n === '1' ? '' : 's'}`
}
