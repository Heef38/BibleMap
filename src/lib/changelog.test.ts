import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkChangelog, compareVersions, parseChangelog } from './changelog'

const SAMPLE = `# Version history

What this file is.

## 0.2 (2026-09-19)

The second version.

- One change
- A change that
  runs on

## 0.1 (2026-09-18)

The first version.

- [A link](/studies)
`

describe('parseChangelog', () => {
  it('reads each version, its sentence and its changes', () => {
    expect(parseChangelog(SAMPLE)).toEqual([
      { version: '0.2', date: '2026-09-19', summary: 'The second version.', changes: ['One change', 'A change that runs on'] },
      { version: '0.1', date: '2026-09-18', summary: 'The first version.', changes: ['[A link](/studies)'] },
    ])
  })
})

describe('compareVersions', () => {
  it('compares part by part', () => {
    expect(compareVersions('0.10', '0.9')).toBe(1)
    expect(compareVersions('0.5', '0.5.0')).toBe(0)
    expect(compareVersions('0.5', '0.5.1')).toBe(-1)
  })
})

describe('checkChangelog', () => {
  it('passes a well-formed file', () => {
    expect(checkChangelog(SAMPLE)).toEqual([])
  })
  it('catches a heading it cannot read, versions out of order, and missing parts', () => {
    const bad = `## 0.1 (2026-09-18)\n\nFirst.\n\n- x\n\n## 0.2 (2026-09-19)\n\n## 0.3 2026-09-20\n`
    const problems = checkChangelog(bad)
    expect(problems.some((p) => p.includes('Cannot read the heading "## 0.3 2026-09-20"'))).toBe(true)
    expect(problems.some((p) => p.includes('0.1 is listed above 0.2'))).toBe(true)
    expect(problems.some((p) => p.includes('0.2: there is no list of changes'))).toBe(true)
  })
})

describe('CHANGELOG.md', () => {
  const text = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8')
  it('is well formed', () => {
    expect(checkChangelog(text)).toEqual([])
  })
  it('starts with the version in package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(compareVersions(parseChangelog(text)[0].version, pkg.version)).toBe(0)
  })
})
