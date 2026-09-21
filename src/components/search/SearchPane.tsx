import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { IconSearch } from '@/components/common/icons'
import { Highlight } from '@/components/common/Highlight'
import { useData } from '@/data/useData'
import { NewTag } from '@/components/common/Updates'
import { isNewStudy } from '@/store/updates'
import { loadBible, loadCanon, loadStudiesIndex } from '@/data/loaders'
import { buildSearchIndex, entityHref, searchEntities, searchVerses, TYPE_LABELS, TYPE_ORDER, type EntityHit } from '@/data/search'
import { parseRefs } from '@/lib/refs'
import { useDebounce } from '@/lib/hooks'
import { truncate } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

const SUGGESTIONS = ['David', 'Jerusalem', 'Kingdom of heaven', 'Abraham', 'Covenant', 'Passover', 'Faith', 'Paul']

export default function SearchPane() {
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 150)
  const navigate = useNavigate()
  const goTo = useSession((s) => s.goTo)
  const searchNonce = useSession((s) => s.searchNonce)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchNonce > 0) inputRef.current?.focus()
  }, [searchNonce])
  const translation = useSettings((s) => s.translation)
  const { data: index } = useData('search-index', buildSearchIndex)
  const { data: canon } = useData('canon', loadCanon)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const { data: studies } = useData('studies-index', loadStudiesIndex)

  const entityHits = useMemo(() => (index && dq.trim() ? searchEntities(index, dq, 5) : null), [index, dq])
  const refHit = useMemo(() => {
    if (!canon || !/\d/.test(dq)) return null
    const r = parseRefs(dq, canon)
    return r.ranges.length && !r.errors.length ? r.ranges[0] : null
  }, [canon, dq])
  const verseHits = useMemo(() => (bible && dq.trim().length >= 3 ? searchVerses(bible, dq, 5000) : null), [bible, dq])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (refHit) {
      goTo(refHit[0])
      return
    }
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const hasQuery = dq.trim().length > 0
  // While a study is new, the Studies link carries a New tag.
  const hasNewStudy = (studies ?? []).some((s) => isNewStudy(s.added))

  return (
    <div className="p-3">
      <form onSubmit={submit} role="search" className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          className="field pl-9"
          placeholder="Person, place, theme, or John 3:16"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the Bible"
          autoComplete="off"
          spellCheck={false}
        />
      </form>

      {!hasQuery && (
        <div className="mt-5">
          <div className="kicker mb-2">Explore</div>
          <Link to="/studies" className="block rounded-lg px-2 py-1.5 -mx-2 text-ink hover:bg-surface-2 hover:no-underline">
            <div className="font-medium">
              Studies {hasNewStudy && <NewTag />}
            </div>
            <div className="text-xs text-ink-2">{studies?.length ? `${studies.length} themes, each drawn as maps and timelines` : 'Themes drawn as maps and timelines'}</div>
          </Link>
          <Link to="/" className="block rounded-lg px-2 py-1.5 -mx-2 text-ink hover:bg-surface-2 hover:no-underline">
            <div className="font-medium">This chapter</div>
            <div className="text-xs text-ink-2">Where the chapter you are reading connects</div>
          </Link>
          <Link to="/timeline" className="block rounded-lg px-2 py-1.5 -mx-2 text-ink hover:bg-surface-2 hover:no-underline">
            <div className="font-medium">The story in time</div>
            <div className="text-xs text-ink-2">All dated events on one timeline</div>
          </Link>
          <Link to="/bible" className="block rounded-lg px-2 py-1.5 -mx-2 text-ink hover:bg-surface-2 hover:no-underline">
            <div className="font-medium">How the Bible is laid out</div>
            <div className="text-xs text-ink-2">The 66 books by kind, drawn to size</div>
          </Link>
          <Link to="/compare" className="block rounded-lg px-2 py-1.5 -mx-2 text-ink hover:bg-surface-2 hover:no-underline">
            <div className="font-medium">Compare two people</div>
            <div className="text-xs text-ink-2">What two lives share, side by side</div>
          </Link>
          <div className="kicker mt-6 mb-2">Try</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip chip-link" onClick={() => setQ(s)}>
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-6 leading-relaxed">
            Search finds people, places, topics and events by name, and every verse containing your words. Type a reference such as <span className="text-ink-2">Ps 23</span> to read it.
          </p>
        </div>
      )}

      {hasQuery && (
        <div className="mt-3 space-y-4">
          {refHit && canon && (
            <button type="button" className="btn w-full justify-start" onClick={() => goTo(refHit[0])}>
              Read {canon.rangeLabel(refHit[0], refHit[1])}
            </button>
          )}
          {entityHits &&
            TYPE_ORDER.filter((t) => entityHits.get(t)?.length).map((t) => (
              <div key={t}>
                <div className="kicker mb-1">{TYPE_LABELS[t]}</div>
                <ul>
                  {entityHits.get(t)!.map((h) => (
                    <li key={h.id}>
                      <HitRow hit={h} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {entityHits && ![...entityHits.values()].some((l) => l.length) && !verseHits?.length && !refHit && (
            <div className="text-muted text-sm">Nothing matches “{dq}”.</div>
          )}
          {verseHits && bible && canon && verseHits.length > 0 && (
            <div>
              <div className="kicker mb-1">
                Verses <span className="text-muted font-normal normal-case tracking-normal">{verseHits.length.toLocaleString()}</span>
              </div>
              <ul className="space-y-1">
                {verseHits.slice(0, 5).map((o) => (
                  <li key={o}>
                    <button type="button" className="block w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-2" onClick={() => goTo(o)}>
                      <div className="text-xs text-ink-2">{canon.label(o)}</div>
                      <div className="text-[13px] leading-snug">
                        <Highlight text={truncate(bible.verses[o], 110)} query={dq} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {verseHits.length > 5 && (
                <Link to={`/search?q=${encodeURIComponent(dq)}`} className="inline-block mt-2 text-sm">
                  See all {verseHits.length.toLocaleString()} verses →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HitRow({ hit }: { hit: EntityHit }) {
  return (
    <Link to={entityHref(hit.type, hit.key)} className="flex items-baseline gap-2 rounded-lg px-2 py-1 -mx-2 text-ink hover:bg-surface-2 hover:no-underline">
      <span className="font-medium truncate shrink-0 max-w-[70%]">{hit.title}</span>
      <span className="text-xs text-muted truncate ml-auto min-w-0">{hit.sub}</span>
    </Link>
  )
}
