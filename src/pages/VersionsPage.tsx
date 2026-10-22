import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/ui'
import { NewTag } from '@/components/common/Updates'
import { SITE } from '@/config/site'
import { VERSIONS } from '@/config/versions'
import { usePageTitle } from '@/store/session'

/** Every version of Bible-Map, newest first, from CHANGELOG.md. */
export default function VersionsPage() {
  usePageTitle('Version history', { description: `Every version of ${SITE.name}, newest first, with what changed in each.` })
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader kicker={SITE.name} title="Version history" subtitle={`Every version of ${SITE.name}, newest first, with what changed in each.`} />
      <ol className="space-y-8">
        {VERSIONS.map((v, i) => (
          <li key={v.version} id={`v${v.version}`}>
            <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-semibold">Version {v.version}</span>
              <time dateTime={v.date} className="text-sm text-muted">
                {longDay(v.date)}
              </time>
              {i === 0 && <NewTag>Current</NewTag>}
            </h2>
            <p className="text-ink-2 mt-1 max-w-prose">{inline(v.summary)}</p>
            <ul className="mt-2.5 list-disc pl-5 space-y-1.5 max-w-prose text-[15px] leading-relaxed marker:text-muted">
              {v.changes.map((c, j) => (
                <li key={j}>{inline(c)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** October 22, 2026, in the reader's own way of writing dates. */
function longDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

/** Typed apostrophes (doesn't) as the curly ones the rest of the site uses (doesn’t). */
const curly = (s: string) => s.replace(/(\w)'(\w)/g, '$1’$2')

/** A changelog line with its Markdown links made real: paths on the site open in place, others in a new tab. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0
    if (at > last) out.push(curly(text.slice(last, at)))
    const label = curly(m[1])
    const url = m[2]
    out.push(
      url.startsWith('/') ? (
        <Link key={at} to={url}>
          {label}
        </Link>
      ) : (
        <a key={at} href={url} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ),
    )
    last = at + m[0].length
  }
  if (last < text.length) out.push(curly(text.slice(last)))
  return out
}
