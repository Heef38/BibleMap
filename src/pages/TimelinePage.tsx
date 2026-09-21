import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import Timeline, { type TimelineBand, type TimelineItem } from '@/components/viz/Timeline'
import { EntityLink, Loading, PageHeader, RefLink, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon, loadEvents, loadPeopleIndex, loadPlacesIndex } from '@/data/loaders'
import type { BibleEvent } from '@/data/types'
import { durationYears, formatDuration, formatYear } from '@/lib/format'
import { ordinalsToRanges } from '@/lib/refs'
import { usePageTitle, useSession } from '@/store/session'

const PERIOD_COLORS = ['var(--series-7)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-2)', 'var(--series-8)', 'var(--series-1)']

export default function TimelinePage() {
  const { data: canon } = useData('canon', loadCanon)
  const { data: events } = useData('events', loadEvents)
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const goTo = useSession((s) => s.goTo)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<BibleEvent | null>(null)

  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])
  const byId = useMemo(() => new Map(events?.map((e) => [e.id, e]) ?? []), [events])

  const { bands, items } = useMemo(() => {
    if (!events) return { bands: [] as TimelineBand[], items: [] as TimelineItem[] }
    const parents = new Set(events.flatMap((e) => e.partOf))
    const q = filter.trim().toLowerCase()
    const matches = (e: BibleEvent) => !q || e.title.toLowerCase().includes(q) || e.participants.some((p) => (personName.get(p) ?? '').toLowerCase().includes(q)) || e.locations.some((l) => (placeName.get(l) ?? '').toLowerCase().includes(q))
    const bands: TimelineBand[] = []
    const items: TimelineItem[] = []
    let ci = 0
    for (const e of events) {
      if (e.year === null) continue
      const years = durationYears(e.duration)
      if (parents.has(e.id) && years !== undefined && years >= 1) {
        bands.push({ id: e.id, label: e.title, start: e.year, end: e.year + years, color: PERIOD_COLORS[ci++ % PERIOD_COLORS.length], sub: `${events.filter((c) => c.partOf.includes(e.id)).length} events within` })
        continue
      }
      if (!matches(e)) continue
      items.push({ id: e.id, label: e.title, year: e.year, end: years !== undefined && years >= 1 ? e.year + years : undefined, sub: e.duration ? formatDuration(e.duration) : undefined, color: q ? 'var(--series-2)' : 'var(--series-1)' })
    }
    return { bands, items }
  }, [events, filter, personName, placeName])

  const focusDomain = useMemo<[number, number] | null>(() => {
    if (!filter.trim() || !items.length) return null
    const ys = items.flatMap((i) => [i.year, i.end ?? i.year])
    const lo = Math.min(...ys)
    const hi = Math.max(...ys)
    const pad = Math.max(3, (hi - lo) * 0.12)
    return [lo - pad, hi + pad]
  }, [filter, items])

  usePageTitle('The story in time')
  if (!canon || !events) return <div className="p-6"><Loading /></div>

  return (
    <div className="p-6">
      <PageHeader
        kicker="Timeline"
        title="The story in time"
        subtitle={`${events.length} dated events from creation to the apostles, on traditional chronology. Zoom in to see the labels; click an event to read it.`}
        right={<input className="field !w-56" placeholder="Filter by title, person or place" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter events" />}
      />
      <Timeline items={items} bands={bands} focusDomain={focusDomain} selectedId={selected?.id ?? null} onItem={(it) => setSelected(byId.get(it.id) ?? null)} onBand={(b) => setSelected(byId.get(b.id) ?? null)} maxItemLanes={12} />

      {selected && (
        <Section title="Selected event">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-lg font-semibold">{selected.title}</h3>
              <span className="text-ink-2 text-sm">
                {formatYear(selected.year)}
                {selected.duration ? ` · ${formatDuration(selected.duration)}` : ''}
              </span>
              <Link to={`/event/${selected.id}`} className="text-sm ml-auto">
                Event page →
              </Link>
            </div>
            {selected.verses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {ordinalsToRanges(selected.verses).map((r) => (
                  <RefLink key={r[0]} range={r} canon={canon} />
                ))}
              </div>
            )}
            {(selected.participants.length > 0 || selected.locations.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selected.participants.map((p) => (
                  <EntityLink key={p} type="person" id={p}>
                    {personName.get(p) ?? p}
                  </EntityLink>
                ))}
                {selected.locations.map((l) => (
                  <EntityLink key={l} type="place" id={l}>
                    <span className="text-muted">◎</span> {placeName.get(l) ?? l}
                  </EntityLink>
                ))}
              </div>
            )}
            {selected.verses.length > 0 && (
              <button type="button" className="btn mt-3" onClick={() => goTo(selected.verses[0])}>
                Read {canon.rangeLabel(selected.verses[0], selected.verses[0])}
              </button>
            )}
          </div>
        </Section>
      )}

      <Section title="Periods" count={bands.length}>
        <div className="flex flex-wrap gap-1.5">
          {bands.map((b) => (
            <button key={b.id} type="button" className="chip chip-link" onClick={() => setSelected(byId.get(b.id) ?? null)}>
              <span className="swatch" style={{ background: b.color }} /> {b.label} <span className="text-muted">{formatYear(Math.round(b.start))}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}
