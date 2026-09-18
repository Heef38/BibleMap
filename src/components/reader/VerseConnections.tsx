import { useMemo, useState } from 'react'
import { EntityLink } from '@/components/common/ui'
import { IconX } from '@/components/common/icons'
import { useData } from '@/data/useData'
import { loadEntities, loadPeopleIndex, loadPlacesIndex, loadXrefs } from '@/data/loaders'
import type { Bible } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { truncate } from '@/lib/format'
import { useSession } from '@/store/session'

export default function VerseConnections({ ordinal, canon, bible, onClose }: { ordinal: number; canon: Canon; bible: Bible; onClose: () => void }) {
  const book = canon.book(canon.locate(ordinal).b)
  const { data: xrefs } = useData(`xrefs:${book.osis}`, () => loadXrefs(book.osis))
  const { data: ents } = useData(`entities:${book.osis}`, () => loadEntities(book.osis))
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const goTo = useSession((s) => s.goTo)
  const [showAll, setShowAll] = useState(false)

  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])

  const refs = xrefs?.[ordinal] ?? []
  const shown = showAll ? refs.slice(0, 80) : refs.slice(0, 8)
  const maxVotes = Math.max(1, refs[0]?.[2] ?? 1)
  const [pIds, lIds] = ents?.[ordinal] ?? [[], []]

  return (
    <div className="border-t border-line bg-surface-2/60 shrink-0 max-h-[45%] overflow-y-auto">
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1 sticky top-0 bg-surface z-10">
        <div className="font-medium text-sm">{canon.label(ordinal)}</div>
        <div className="text-xs text-muted">{refs.length ? `${refs.length} cross references` : ''}</div>
        <button type="button" className="btn btn-ghost ml-auto -mr-2" onClick={onClose} title="Close">
          <IconX />
        </button>
      </div>
      {(pIds.length > 0 || lIds.length > 0) && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {pIds.map((id) => (
            <EntityLink key={id} type="person" id={id}>
              {personName.get(id) ?? id}
            </EntityLink>
          ))}
          {lIds.map((id) => (
            <EntityLink key={id} type="place" id={id}>
              <span className="text-muted">◎</span> {placeName.get(id) ?? id}
            </EntityLink>
          ))}
        </div>
      )}
      {refs.length > 0 && (
        <ul className="px-2 pb-2">
          {shown.map(([s, e, votes], i) => (
            <li key={i}>
              <button type="button" className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface-2 flex gap-3 items-start" onClick={() => goTo(s)}>
                <span className="w-24 shrink-0">
                  <span className="block text-sm font-medium leading-tight">{canon.rangeLabel(s, e, 'short')}</span>
                  <span className="block h-1 mt-1 rounded-full bg-[var(--series-1)]" style={{ width: `${Math.max(8, (Math.max(votes, 0) / maxVotes) * 100)}%`, opacity: 0.85 }} aria-hidden />
                </span>
                <span className="text-[13px] text-ink-2 leading-snug">{truncate(bible.verses[s] || '', 120)}</span>
              </button>
            </li>
          ))}
          {refs.length > 8 && (
            <li className="px-2 pt-1">
              <button type="button" className="text-sm text-accent" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show ${Math.min(refs.length, 80) - 8} more`}
              </button>
            </li>
          )}
        </ul>
      )}
      {xrefs && !refs.length && !pIds.length && !lIds.length && <div className="px-4 pb-3 text-sm text-muted">No recorded connections for this verse.</div>}
    </div>
  )
}
