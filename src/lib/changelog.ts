/** One version in CHANGELOG.md. */
export interface Version {
  /** 0.5, or 0.5.1 for a fix */
  version: string
  /** YYYY-MM-DD, the day it went live */
  date: string
  /** the sentence under the heading */
  summary: string
  /** the list under it, one item per change (Markdown links allowed) */
  changes: string[]
}

const HEADING = /^##\s+(\d+(?:\.\d+){1,2})\s+\((\d{4}-\d{2}-\d{2})\)\s*$/
const ITEM = /^[-*]\s+/

/**
 * The versions in CHANGELOG.md, in file order (newest first). A version starts with a heading like
 * `## 0.5 (2026-10-22)`; the text under it before the list is its summary, and each `- ` item is a
 * change, with indented lines continuing the item above. Anything before the first heading is the
 * file's own introduction. Lines it cannot read are skipped here and reported by `checkChangelog`.
 */
export function parseChangelog(text: string): Version[] {
  const versions: Version[] = []
  let current: Version | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    const heading = HEADING.exec(line)
    if (heading) {
      current = { version: heading[1], date: heading[2], summary: '', changes: [] }
      versions.push(current)
    } else if (!current || line.startsWith('#') || !line.trim()) {
      continue
    } else if (ITEM.test(line)) {
      current.changes.push(line.replace(ITEM, ''))
    } else if (/^\s/.test(line) && current.changes.length) {
      current.changes[current.changes.length - 1] += ` ${line.trim()}`
    } else {
      current.summary = current.summary ? `${current.summary} ${line.trim()}` : line.trim()
    }
  }
  return versions
}

/** -1, 0 or 1 as version a is older than, the same as, or newer than version b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return Math.sign(d)
  }
  return 0
}

/** The problems in a changelog, as sentences; empty when it is well formed. */
export function checkChangelog(text: string): string[] {
  const problems: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line) && !HEADING.test(line.trimEnd())) problems.push(`Cannot read the heading "${line}". Write it as "## 0.6 (YYYY-MM-DD)".`)
  }
  const versions = parseChangelog(text)
  if (!versions.length) problems.push('There are no versions.')
  versions.forEach((v, i) => {
    if (Number.isNaN(Date.parse(v.date))) problems.push(`${v.version}: ${v.date} is not a date.`)
    if (!v.summary) problems.push(`${v.version}: the sentence under the heading is missing.`)
    if (!v.changes.length) problems.push(`${v.version}: there is no list of changes.`)
    const older = versions[i + 1]
    if (older && compareVersions(v.version, older.version) <= 0) problems.push(`${v.version} is listed above ${older.version}; newest goes first.`)
    if (older && v.date < older.date) problems.push(`${v.version} (${v.date}) is dated before ${older.version} (${older.date}).`)
  })
  return problems
}
