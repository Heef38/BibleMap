import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import { EntityLink, ErrorBlock, Loading, PageHeader, RefLink, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon, loadEvents, loadPeopleIndex, loadPlacesIndex } from '@/data/loaders'
import { formatYear } from '@/lib/format'
import { ordinalsToRanges } from '@/lib/refs'
import { useSession } from '@/store/session'

const COLOR = 'var(--series-4)'

export default function EventPage() {
  const { id = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: events, error } = useData('events', loadEvents)
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const setHighlights = useSession((s) => s.setHighlights)
  const event = useMemo(() => events?.find((e) => e.id === id), [events, id])
  const ranges = useMemo(() => (event ? ordinalsToRanges(event.verses) : []), [event])
  useEffect(() => {
    if (!event) return
    setHighlights([{ ranges, color: COLOR, label: event.title }])
    return () => setHighlights([])
  }, [event, ranges, setHighlights])
  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])
  const byId = useMemo(() => new Map(events?.map((e) => [e.id, e]) ?? []), [events])

  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !events) return <div className="p-6"><Loading /></div>
  if (!event) return <div className="p-6 text-ink-2">No event with id “{id}”.</div>

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        kicker="Event"
        title={event.title}
        subtitle={
          <>
            {event.year !== null && <span>{formatYear(event.year)} (traditional dating)</span>}
            {event.duration && <span> · {event.duration.replace(/^(\d+)([DMY])$/, (_, n, u) => `${n} ${u === 'D' ? 'day' : u === 'M' ? 'month' : 'year'}${n === '1' ? '' : 's'}`)}</span>}
          </>
        }
      />
      <CanonStrip canon={canon} ranges={ranges} color={COLOR} />
      {event.verses.length > 0 && (
        <Section title="Passages">
          <div className="flex flex-wrap gap-1.5">
            {ranges.map((r) => (
              <RefLink key={r[0]} range={r} canon={canon} />
            ))}
          </div>
        </Section>
      )}
      {event.participants.length > 0 && (
        <Section title="People">
          <div className="flex flex-wrap gap-1.5">
            {event.participants.map((p) => (
              <EntityLink key={p} type="person" id={p}>
                {personName.get(p) ?? p}
              </EntityLink>
            ))}
          </div>
        </Section>
      )}
      {event.locations.length > 0 && (
        <Section title="Places">
          <div className="flex flex-wrap gap-1.5">
            {event.locations.map((p) => (
              <EntityLink key={p} type="place" id={p}>
                {placeName.get(p) ?? p}
              </EntityLink>
            ))}
          </div>
        </Section>
      )}
      {(event.predecessor.length > 0 || event.partOf.length > 0) && (
        <Section title="In sequence">
          <div className="text-sm space-y-1">
            {event.predecessor.map((p) => (
              <div key={p}>
                <span className="text-ink-2">After </span>
                <EntityLink type="event" id={p} className="text-accent">
                  {byId.get(p)?.title ?? p}
                </EntityLink>
              </div>
            ))}
            {event.partOf.map((p) => (
              <div key={p}>
                <span className="text-ink-2">Part of </span>
                <EntityLink type="event" id={p} className="text-accent">
                  {byId.get(p)?.title ?? p}
                </EntityLink>
              </div>
            ))}
          </div>
        </Section>
      )}
      {event.notes && (
        <Section title="Notes">
          <p className="text-sm text-ink-2 whitespace-pre-line">{event.notes}</p>
        </Section>
      )}
    </div>
  )
}
