import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import { Highlight } from '@/components/common/Highlight'
import { EmptyState, Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadCanon } from '@/data/loaders'
import { buildSearchIndex, entityHref, searchEntities, searchVerses, TYPE_LABELS, TYPE_ORDER } from '@/data/search'
import { ordinalsToRanges } from '@/lib/refs'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const translation = useSettings((s) => s.translation)
  const { data: canon } = useData('canon', loadCanon)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const { data: index } = useData('search-index', buildSearchIndex)
  const goTo = useSession((s) => s.goTo)
  const setHighlights = useSession((s) => s.setHighlights)
  const [limit, setLimit] = useState(100)

  const hits = useMemo(() => (bible && q.length >= 2 ? searchVerses(bible, q) : []), [bible, q])
  const ranges = useMemo(() => ordinalsToRanges(hits), [hits])
  const entities = useMemo(() => (index && q ? searchEntities(index, q, 8) : null), [index, q])

  useEffect(() => {
    setLimit(100)
  }, [q])
  useEffect(() => {
    setHighlights(ranges.length ? [{ ranges, color: 'var(--series-2)', label: `“${q}”` }] : [])
    return () => setHighlights([])
  }, [ranges, q, setHighlights])

  if (!canon || !bible) return <div className="p-6"><Loading /></div>

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader kicker="Search" title={q ? <>“{q}”</> : 'Search'} subtitle={q ? `${hits.length.toLocaleString()} verses in the ${bible.abbrev} contain ${hits.length === 1 ? 'it' : 'these words'}.` : 'Type something in the search box.'} />
      {q && <CanonStrip canon={canon} ranges={ranges} color="var(--series-2)" />}

      {entities && [...entities.values()].some((l) => l.length) && (
        <Section title="Matches by name">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {TYPE_ORDER.filter((t) => entities.get(t)?.length).map((t) => (
              <div key={t}>
                <div className="kicker mb-1">{TYPE_LABELS[t]}</div>
                <div className="flex flex-wrap gap-1.5">
                  {entities.get(t)!.map((h) => (
                    <Link key={h.id} to={entityHref(h.type, h.key)} className="chip chip-link">
                      {h.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Verses" count={hits.length}>
        {hits.length === 0 ? (
          <EmptyState>No verses contain {q ? `“${q}”` : 'that'}. Try fewer words, or put a phrase in quotes.</EmptyState>
        ) : (
          <ol className="space-y-1">
            {hits.slice(0, limit).map((o) => (
              <li key={o}>
                <button type="button" className="w-full text-left rounded-lg px-3 py-2 -mx-3 hover:bg-surface-2 flex gap-4 items-baseline" onClick={() => goTo(o)}>
                  <span className="w-24 shrink-0 text-sm font-medium">{canon.label(o, 'short')}</span>
                  <span className="scripture !text-[15px] !leading-snug">
                    <Highlight text={bible.verses[o]} query={q} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {hits.length > limit && (
          <button type="button" className="btn mt-3" onClick={() => setLimit((l) => l + 200)}>
            Show more ({(hits.length - limit).toLocaleString()} left)
          </button>
        )}
      </Section>
    </div>
  )
}
