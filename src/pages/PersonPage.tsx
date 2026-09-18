import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import Timeline, { type TimelineBand, type TimelineBin, type TimelineItem } from '@/components/viz/Timeline'
import VerseList from '@/components/common/VerseList'
import { DictText, EntityLink, ErrorBlock, Loading, PageHeader, RefLink, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon, loadEvents, loadPeopleIndex, loadPerson, loadPlacesIndex, loadYears } from '@/data/loaders'
import { durationYears, formatDuration, formatYear, formatYearRange } from '@/lib/format'
import { ordinalsToRanges } from '@/lib/refs'
import { useSession } from '@/store/session'

const COLOR = 'var(--series-1)'

export default function PersonPage() {
  const { id = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: person, error } = useData(`person:${id}`, () => loadPerson(id))
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const { data: events } = useData('events', loadEvents)
  const { data: verseYears } = useData('years', loadYears)
  const setHighlights = useSession((s) => s.setHighlights)
  const goTo = useSession((s) => s.goTo)
  const navigate = useNavigate()

  const ranges = useMemo(() => (person ? ordinalsToRanges(person.verses) : []), [person])
  useEffect(() => {
    if (!person) return
    setHighlights([{ ranges, color: COLOR, label: person.title }])
    return () => setHighlights([])
  }, [person, ranges, setHighlights])

  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])
  const myEvents = useMemo(() => (events ?? []).filter((e) => e.participants.includes(id)), [events, id])
  const peopleById = useMemo(() => new Map(people?.map((p) => [p.id, p]) ?? []), [people])

  const bins = useMemo<TimelineBin[]>(() => {
    if (!person || !verseYears) return []
    const m = new Map<number, number[]>()
    for (const o of person.verses) {
      const y = verseYears[o]
      if (y === null || y === undefined) continue
      ;(m.get(y) ?? m.set(y, []).get(y)!).push(o)
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([year, ordinals]) => ({ year, count: ordinals.length, ordinals }))
  }, [person, verseYears])
  const bands = useMemo<TimelineBand[]>(() => {
    if (!person) return []
    const out: TimelineBand[] = []
    if (person.birth !== undefined && person.death !== undefined) out.push({ id: person.id, label: person.title, start: person.birth, end: person.death, color: 'var(--series-1)', emphasis: true })
    const rels: [string, string[]][] = [
      ['father', person.father],
      ['mother', person.mother],
      ['spouse', person.partners],
      ['child', person.children],
    ]
    for (const [rel, ids] of rels)
      for (const pid of ids) {
        const e = peopleById.get(pid)
        if (e && e.birth !== undefined && e.death !== undefined) out.push({ id: pid, label: `${e.title} · ${rel}`, start: e.birth, end: e.death })
      }
    return out
  }, [person, peopleById])
  const items = useMemo<TimelineItem[]>(
    () =>
      myEvents
        .filter((e) => e.year !== null)
        .map((e) => {
          const y = durationYears(e.duration)
          return { id: e.id, label: e.title, year: e.year!, end: y !== undefined && y >= 1 ? e.year! + y : undefined, sub: e.duration ? formatDuration(e.duration) : undefined }
        }),
    [myEvents],
  )
  const initialDomain = useMemo<[number, number] | undefined>(() => {
    if (!person) return undefined
    if (person.birth !== undefined && person.death !== undefined) {
      const pad = Math.max(5, (person.death - person.birth) * 0.15)
      return [person.birth - pad, person.death + pad]
    }
    const ys = bins.flatMap((b) => Array<number>(b.count).fill(b.year)).concat(items.map((i) => i.year))
    if (ys.length < 3) return undefined
    ys.sort((a, b) => a - b)
    const lo = ys[Math.floor(ys.length * 0.05)]
    const hi = ys[Math.floor(ys.length * 0.95)]
    const pad = Math.max(5, (hi - lo) * 0.1)
    return [lo - pad, hi + pad]
  }, [person, bins, items])
  const eventById = useMemo(() => new Map(myEvents.map((e) => [e.id, e])), [myEvents])

  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !person) return <div className="p-6"><Loading /></div>

  const books = new Set(person.verses.map((o) => canon.locate(o).b)).size
  const years = person.birth !== undefined || person.death !== undefined ? formatYearRange(person.birth, person.death) : ''
  const family: [string, string[]][] = [
    ['Father', person.father],
    ['Mother', person.mother],
    ['Spouse', person.partners],
    ['Children', person.children],
    ['Siblings', person.siblings],
  ]
  const hasFamily = family.some(([, ids]) => ids.length)

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        kicker="Person"
        title={person.title}
        subtitle={
          <>
            {person.gender && <span>{person.gender} · </span>}
            {years && <span>{years} · </span>}
            {person.verseCount.toLocaleString()} verse{person.verseCount === 1 ? '' : 's'} in {books} book{books === 1 ? '' : 's'}
            {person.aka.length > 0 && <span> · also called {person.aka.join(', ')}</span>}
          </>
        }
      />
      <CanonStrip canon={canon} ranges={ranges} color={COLOR} caption={`Where ${person.title} appears`} />

      {(bins.length > 0 || items.length > 0 || bands.length > 0) && (
        <Section title="Timeline">
          <Timeline
            items={items}
            bands={bands}
            bins={bins}
            initialDomain={initialDomain}
            binLabel="mentions"
            onItem={(it) => {
              const e = eventById.get(it.id)
              if (e?.verses.length) goTo(e.verses[0])
            }}
            onBand={(b) => {
              if (b.id !== person.id) navigate(`/person/${b.id}`)
            }}
            onBin={(bin) => goTo(bin.ordinals[0])}
          />
          <p className="text-xs text-muted mt-1">Bars count the verses that mention {person.title} in each year of the story; dots are events {person.title} took part in. Years are traditional and approximate.</p>
        </Section>
      )}

      {person.dict && (
        <Section title="Easton's Bible Dictionary">
          <DictText text={person.dict} canon={canon} />
        </Section>
      )}

      {hasFamily && (
        <Section title="Family">
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 gap-x-3 text-sm">
            {family
              .filter(([, ids]) => ids.length)
              .map(([label, ids]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-2">{label}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {ids.map((pid) => (
                      <EntityLink key={pid} type="person" id={pid}>
                        {personName.get(pid) ?? pid}
                      </EntityLink>
                    ))}
                  </dd>
                </div>
              ))}
          </dl>
        </Section>
      )}

      {(person.birthPlace.length > 0 || person.deathPlace.length > 0) && (
        <Section title="Places">
          <div className="flex flex-wrap gap-4 text-sm">
            {person.birthPlace.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-ink-2">Born in</span>
                {person.birthPlace.map((pl) => (
                  <EntityLink key={pl} type="place" id={pl}>
                    {placeName.get(pl) ?? pl}
                  </EntityLink>
                ))}
              </div>
            )}
            {person.deathPlace.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-ink-2">Died in</span>
                {person.deathPlace.map((pl) => (
                  <EntityLink key={pl} type="place" id={pl}>
                    {placeName.get(pl) ?? pl}
                  </EntityLink>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {myEvents.length > 0 && (
        <Section title="Events" count={myEvents.length}>
          <ol className="text-sm divide-y divide-line">
            {myEvents.map((e) => (
              <li key={e.id} className="flex gap-3 py-1.5 items-baseline">
                <span className="w-20 shrink-0 text-ink-2 tabular-nums">{formatYear(e.year)}</span>
                <EntityLink type="event" id={e.id} className="text-ink hover:text-accent">
                  {e.title}
                </EntityLink>
                <span className="ml-auto flex gap-1 shrink-0">
                  {e.verses.length > 0 && <RefLink range={[e.verses[0], e.verses[0]]} canon={canon} />}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="Verses" count={person.verseCount}>
        <VerseList ordinals={person.verses} canon={canon} />
      </Section>
    </div>
  )
}
