import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import VerseList from '@/components/common/VerseList'
import { DictText, EntityLink, ErrorBlock, Loading, NameCard, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon, loadEvents, loadPeopleIndex, loadPlace } from '@/data/loaders'
import { formatYear } from '@/lib/format'
import { ordinalsToRanges } from '@/lib/refs'
import { useSession } from '@/store/session'

const COLOR = 'var(--series-3)'

export default function PlacePage() {
  const { id = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: place, error } = useData(`place:${id}`, () => loadPlace(id))
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: events } = useData('events', loadEvents)
  const setHighlights = useSession((s) => s.setHighlights)

  const ranges = useMemo(() => (place ? ordinalsToRanges(place.verses) : []), [place])
  useEffect(() => {
    if (!place) return
    setHighlights([{ ranges, color: COLOR, label: place.name }])
    return () => setHighlights([])
  }, [place, ranges, setHighlights])
  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const here = useMemo(() => (events ?? []).filter((e) => e.locations.includes(id)), [events, id])

  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !place) return <div className="p-6"><Loading /></div>

  const books = new Set(place.verses.map((o) => canon.locate(o).b)).size
  return (
    <div className="p-6">
      <PageHeader
        kicker={place.type ? `Place · ${place.type}` : 'Place'}
        title={place.name}
        subtitle={
          <>
            {place.verseCount.toLocaleString()} verse{place.verseCount === 1 ? '' : 's'} in {books} book{books === 1 ? '' : 's'}
            {place.aliases.length > 0 && <span> · also called {place.aliases.join(', ')}</span>}
            {place.lat !== undefined && place.lon !== undefined && (
              <span>
                {' '}
                ·{' '}
                <a href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=9/${place.lat}/${place.lon}`} target="_blank" rel="noreferrer">
                  {place.lat.toFixed(3)}, {place.lon.toFixed(3)}
                </a>
                {place.precision && place.precision !== 'Precise' ? ` (${place.precision.toLowerCase()})` : ''}
              </span>
            )}
          </>
        }
      />
      <NameCard name={place.name} meaning={place.name_meaning} />
      <div className="mt-4" />
      <CanonStrip canon={canon} ranges={ranges} color={COLOR} caption={`Where ${place.name} appears`} />
      {place.dict && (
        <Section title="Easton's Bible Dictionary">
          <DictText text={place.dict} canon={canon} />
        </Section>
      )}
      {(place.peopleBorn.length > 0 || place.peopleDied.length > 0) && (
        <Section title="People">
          <div className="flex flex-wrap gap-4 text-sm">
            {place.peopleBorn.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-ink-2">Born here</span>
                {place.peopleBorn.map((p) => (
                  <EntityLink key={p} type="person" id={p}>
                    {personName.get(p) ?? p}
                  </EntityLink>
                ))}
              </div>
            )}
            {place.peopleDied.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-ink-2">Died here</span>
                {place.peopleDied.map((p) => (
                  <EntityLink key={p} type="person" id={p}>
                    {personName.get(p) ?? p}
                  </EntityLink>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
      {here.length > 0 && (
        <Section title="Events here" count={here.length}>
          <ol className="text-sm divide-y divide-line">
            {here.map((e) => (
              <li key={e.id} className="flex gap-3 py-1.5 items-baseline">
                <span className="w-20 shrink-0 text-ink-2 tabular-nums">{formatYear(e.year)}</span>
                <EntityLink type="event" id={e.id} className="text-ink hover:text-accent">
                  {e.title}
                </EntityLink>
              </li>
            ))}
          </ol>
        </Section>
      )}
      <Section title="Verses" count={place.verseCount}>
        <VerseList ordinals={place.verses} canon={canon} />
      </Section>
    </div>
  )
}
