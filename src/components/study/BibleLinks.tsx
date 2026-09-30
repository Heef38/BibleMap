import type { StudyRef } from '@/data/types'
import { EDITION } from '@edition/config'

/** Where the Bible tells the same thing: links that open the passage on Bible-Map, in a new tab. */
export default function BibleLinks({ item, className = '' }: { item: StudyRef; className?: string }) {
  if (!item.bible?.length || !EDITION.bibleSite) return null
  return (
    <span className={`flex flex-wrap items-baseline gap-1 ${className}`}>
      <span className="text-xs text-muted">In the Bible:</span>
      {item.bible.map((b) => (
        <a key={b.osis + b.label} className="chip chip-link !py-0 text-xs" href={`${EDITION.bibleSite}/?p=${encodeURIComponent(b.osis)}`} target="_blank" rel="noopener noreferrer" title={`Open ${b.label} on Bible-Map`}>
          {b.label} ↗
        </a>
      ))}
    </span>
  )
}
