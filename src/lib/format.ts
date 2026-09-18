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
