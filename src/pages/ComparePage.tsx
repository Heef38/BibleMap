import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import DualMap, { type DualBranch, type DualDot } from '@/components/viz/DualMap'
import Timeline, { type TimelineBand, type TimelineItem } from '@/components/viz/Timeline'
import { EntityLink, Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadEntities, loadEvents, loadPeopleIndex, loadPerson, loadPlacesIndex, loadYears } from '@/data/loaders'
import { buildSearchIndex, searchEntities } from '@/data/search'
import type { Person, VerseEntities } from '@/data/types'
import { durationYears, formatYear, formatYearRange, truncate } from '@/lib/format'
import { useDebounce } from '@/lib/hooks'
import { ordinalsToRanges } from '@/lib/refs'
import { useSettings } from '@/store/settings'
import { usePageTitle, useSession } from '@/store/session'

const COLOR_A = 'var(--series-1)'
const COLOR_B = 'var(--series-2)'
const COLOR_SHARED = 'var(--series-7)'
const CAP = 12

const SUGGESTED: [string, string, string][] = [
  ['david_994', 'saul_2478', 'David and Saul'],
  ['david_994', 'jonathan_1692', 'David and Jonathan'],
  ['moses_2108', 'aaron_1', 'Moses and Aaron'],
  ['elijah_1131', 'elisha_1153', 'Elijah and Elisha'],
  ['paul_2479', 'jesus_905', 'Paul and Jesus'],
]

function PersonPicker({ value, label, onPick }: { value?: string; label: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 120)
  const { data: index } = useData('search-index', buildSearchIndex)
  const hits = useMemo(() => (index && dq.trim() ? (searchEntities(index, dq, 8).get('person') ?? []) : []), [index, dq])
  const { data: people } = useData('people-index', loadPeopleIndex)
  const current = people?.find((p) => p.id === value)
  return (
    <div className="relative">
      <label className="block">
        <span className="kicker">{label}</span>
        <input className="field mt-1" placeholder={current ? current.title : 'Type a name'} value={q} onChange={(e) => setQ(e.target.value)} aria-label={label} autoComplete="off" />
      </label>
      {hits.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-line-strong bg-surface py-1 text-sm" style={{ boxShadow: 'var(--shadow)' }}>
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-surface-2 flex items-baseline gap-2"
                onClick={() => {
                  onPick(h.key)
                  setQ('')
                }}
              >
                <span className="font-medium">{h.title}</span>
                <span className="text-xs text-muted ml-auto">{h.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function intersectSorted(a: number[], b: number[]): number[] {
  const out: number[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push(a[i])
      i++
      j++
    } else if (a[i] < b[j]) i++
    else j++
  }
  return out
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const aId = params.get('a') ?? ''
  const bId = params.get('b') ?? ''
  const { data: canon } = useData('canon', loadCanon)
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const { data: events } = useData('events', loadEvents)
  const { data: years } = useData('years', loadYears)
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const { data: a, error: errA } = useData(aId ? `person:${aId}` : null, () => loadPerson(aId))
  const { data: b, error: errB } = useData(bId ? `person:${bId}` : null, () => loadPerson(bId))
  const goTo = useSession((s) => s.goTo)
  const setHighlights = useSession((s) => s.setHighlights)

  const booksKey = useMemo(() => {
    if (!canon || !a || !b) return null
    const set = new Set<string>()
    for (const o of [...a.verses, ...b.verses]) set.add(canon.book(canon.locate(o).b).osis)
    return [...set].sort().join(',')
  }, [canon, a, b])
  const { data: ents } = useData(booksKey ? `entities-multi:${booksKey}` : null, async () => {
    const merged: VerseEntities = {}
    const lists = await Promise.all(booksKey!.split(',').map((osis) => loadEntities(osis)))
    for (const l of lists) Object.assign(merged, l)
    return merged
  })

  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])
  const personMeaning = useMemo(() => new Map(people?.filter((p) => p.meaning).map((p) => [p.id, p.meaning!]) ?? []), [people])
  const setPair = (which: 'a' | 'b', id: string) => {
    const next = new URLSearchParams(params)
    next.set(which, id)
    setParams(next)
  }

  const cmp = useMemo(() => {
    if (!canon || !a || !b || !ents || !events) return null
    const sharedVerses = intersectSorted(a.verses, b.verses)
    const count = (p: Person) => {
      const pc = new Map<string, number>()
      const lc = new Map<string, number>()
      for (const o of p.verses) {
        const row = ents[o]
        if (!row) continue
        for (const id of row[0]) if (id !== a.id && id !== b.id) pc.set(id, (pc.get(id) ?? 0) + 1)
        for (const id of row[1]) lc.set(id, (lc.get(id) ?? 0) + 1)
      }
      return { pc, lc }
    }
    const ca = count(a)
    const cb = count(b)
    const split = (ma: Map<string, number>, mb: Map<string, number>) => {
      const shared = [...ma.keys()].filter((id) => mb.has(id)).sort((x, y) => (ma.get(y)! + mb.get(y)!) - (ma.get(x)! + mb.get(x)!))
      const onlyA = [...ma.keys()].filter((id) => !mb.has(id)).sort((x, y) => ma.get(y)! - ma.get(x)!)
      const onlyB = [...mb.keys()].filter((id) => !ma.has(id)).sort((x, y) => mb.get(y)! - mb.get(x)!)
      return { shared, onlyA, onlyB }
    }
    const peopleSplit = split(ca.pc, cb.pc)
    const placesSplit = split(ca.lc, cb.lc)
    const evA = events.filter((e) => e.participants.includes(a.id))
    const evB = events.filter((e) => e.participants.includes(b.id))
    const sharedEv = evA.filter((e) => e.participants.includes(b.id))
    const onlyEvA = evA.filter((e) => !e.participants.includes(b.id))
    const onlyEvB = evB.filter((e) => !e.participants.includes(a.id))
    return { sharedVerses, ca, cb, peopleSplit, placesSplit, sharedEv, onlyEvA, onlyEvB }
  }, [canon, a, b, ents, events])

  const aRanges = useMemo(() => (a ? ordinalsToRanges(a.verses) : []), [a])
  const bRanges = useMemo(() => (b ? ordinalsToRanges(b.verses) : []), [b])
  useEffect(() => {
    if (!a || !b) return
    setHighlights([
      { ranges: aRanges, color: COLOR_A, label: a.title },
      { ranges: bRanges, color: COLOR_B, label: b.title },
    ])
    return () => setHighlights([])
  }, [a, b, aRanges, bRanges, setHighlights])

  const snip = (o: number) => (bible ? truncate(bible.verses[o] || '', 120) : undefined)

  const map = useMemo(() => {
    if (!canon || !a || !b || !cmp) return null
    const targets = new Map<string, () => void>()
    const verseDots = (ords: number[], prefix: string): DualDot[] =>
      ordinalsToRanges(ords)
        .slice(0, CAP)
        .map((r, i) => {
          const id = `${prefix}v${i}`
          targets.set(id, () => goTo(r[0]))
          return { id, label: canon.rangeLabel(r[0], r[1], 'short'), snippet: snip(r[0]) }
        })
    const peopleDots = (ids: string[], prefix: string, counts: (id: string) => string): DualDot[] =>
      ids.slice(0, CAP).map((id) => {
        targets.set(`${prefix}p:${id}`, () => navigate(`/person/${id}`))
        return { id: `${prefix}p:${id}`, label: personName.get(id) ?? id, sub: [personMeaning.get(id) ? `“${personMeaning.get(id)}”` : undefined, counts(id)].filter(Boolean).join(' · ') }
      })
    const placeDots = (ids: string[], prefix: string, counts: (id: string) => string): DualDot[] =>
      ids.slice(0, CAP).map((id) => {
        targets.set(`${prefix}l:${id}`, () => navigate(`/place/${id}`))
        return { id: `${prefix}l:${id}`, label: placeName.get(id) ?? id, sub: counts(id) }
      })
    const eventDots = (evs: typeof cmp.sharedEv, prefix: string): DualDot[] =>
      evs.slice(0, CAP).map((e) => {
        targets.set(`${prefix}e:${e.id}`, () => navigate(`/event/${e.id}`))
        return { id: `${prefix}e:${e.id}`, label: e.title, sub: formatYear(e.year) }
      })
    const n = (m: Map<string, number>, id: string) => `${m.get(id) ?? 0} verse${(m.get(id) ?? 0) === 1 ? '' : 's'}`
    const both = (id: string, ma: Map<string, number>, mb: Map<string, number>) => `with ${a.title}: ${ma.get(id) ?? 0} · with ${b.title}: ${mb.get(id) ?? 0}`
    const bridges: DualBranch[] = []
    if (cmp.sharedVerses.length) bridges.push({ id: 'verses', title: 'Together in the same verses', color: COLOR_SHARED, dots: verseDots(cmp.sharedVerses, 's'), more: Math.max(0, ordinalsToRanges(cmp.sharedVerses).length - CAP) })
    if (cmp.peopleSplit.shared.length) bridges.push({ id: 'people', title: 'People both know', color: COLOR_SHARED, dots: peopleDots(cmp.peopleSplit.shared, 's', (id) => both(id, cmp.ca.pc, cmp.cb.pc)), more: Math.max(0, cmp.peopleSplit.shared.length - CAP) })
    if (cmp.placesSplit.shared.length) bridges.push({ id: 'places', title: 'Places both appear in', color: COLOR_SHARED, dots: placeDots(cmp.placesSplit.shared, 's', (id) => both(id, cmp.ca.lc, cmp.cb.lc)), more: Math.max(0, cmp.placesSplit.shared.length - CAP) })
    if (cmp.sharedEv.length) bridges.push({ id: 'events', title: 'Events they share', color: COLOR_SHARED, dots: eventDots(cmp.sharedEv, 's'), more: Math.max(0, cmp.sharedEv.length - CAP) })
    const side = (p: Person, ps: string[], ls: string[], evs: typeof cmp.sharedEv, pc: Map<string, number>, lc: Map<string, number>, color: string, prefix: string): DualBranch[] => {
      const out: DualBranch[] = []
      if (ps.length) out.push({ id: `${prefix}people`, title: `${p.title}'s people`, color, dots: peopleDots(ps, prefix, (id) => n(pc, id)), more: Math.max(0, ps.length - CAP) })
      if (ls.length) out.push({ id: `${prefix}places`, title: `${p.title}'s places`, color, dots: placeDots(ls, prefix, (id) => n(lc, id)), more: Math.max(0, ls.length - CAP) })
      if (evs.length) out.push({ id: `${prefix}events`, title: `${p.title}'s events`, color, dots: eventDots(evs, prefix), more: Math.max(0, evs.length - CAP) })
      return out
    }
    return {
      bridges,
      left: side(a, cmp.peopleSplit.onlyA, cmp.placesSplit.onlyA, cmp.onlyEvA, cmp.ca.pc, cmp.ca.lc, COLOR_A, 'a'),
      right: side(b, cmp.peopleSplit.onlyB, cmp.placesSplit.onlyB, cmp.onlyEvB, cmp.cb.pc, cmp.cb.lc, COLOR_B, 'b'),
      targets,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canon, a, b, cmp, personName, placeName, personMeaning, bible])

  const timeline = useMemo(() => {
    if (!a || !b || !cmp) return null
    const bands: TimelineBand[] = []
    if (a.birth !== undefined && a.death !== undefined) bands.push({ id: a.id, label: a.title, start: a.birth, end: a.death, color: COLOR_A, emphasis: true })
    if (b.birth !== undefined && b.death !== undefined) bands.push({ id: b.id, label: b.title, start: b.birth, end: b.death, color: COLOR_B, emphasis: true })
    const item = (e: typeof cmp.sharedEv[number], color: string): TimelineItem => {
      const y = durationYears(e.duration)
      return { id: e.id, label: e.title, year: e.year!, end: y !== undefined && y >= 1 ? e.year! + y : undefined, color }
    }
    const items = [...cmp.sharedEv.map((e) => item(e, COLOR_SHARED)), ...cmp.onlyEvA.map((e) => item(e, COLOR_A)), ...cmp.onlyEvB.map((e) => item(e, COLOR_B))].filter((i) => Number.isFinite(i.year))
    return { bands, items }
  }, [a, b, cmp])

  const mentionYears = (p: Person) => {
    if (!years) return null
    const ys = p.verses.map((o) => years[o]).filter((y): y is number => y !== null && y !== undefined).sort((x, y) => x - y)
    if (ys.length < 3) return null
    return [ys[Math.floor(ys.length * 0.05)], ys[Math.floor(ys.length * 0.95)]] as [number, number]
  }

  const err = errA ?? errB
  usePageTitle(a && b ? `${a.title} and ${b.title}` : 'Compare two people', {
    description: a && b ? `${a.title} and ${b.title} in the Bible, side by side: the verses, people, places and events they share, and what belongs to each alone.` : 'Put two people from the Bible side by side: the verses, people, places and events they share.',
  })
  if (err) return <div className="p-6 text-ink-2">Could not load one of the people: {err.message}</div>

  return (
    <div className="p-6">
      <PageHeader kicker="Compare" title={a && b ? `${a.title} and ${b.title}` : 'Compare two people'} subtitle="Two people on one map: what they share between them, and what belongs to each alone." />
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <PersonPicker value={aId} label="First person" onPick={(id) => setPair('a', id)} />
        <PersonPicker value={bId} label="Second person" onPick={(id) => setPair('b', id)} />
      </div>
      {!(aId && bId) && (
        <div className="text-sm text-ink-2">
          <span className="mr-2">Try a pair:</span>
          {SUGGESTED.map(([x, y, label]) => (
            <Link key={label} to={`/compare?a=${x}&b=${y}`} className="chip chip-link mr-1.5">
              {label}
            </Link>
          ))}
        </div>
      )}
      {aId && bId && (!canon || !a || !b || !map || !cmp) && <Loading label="Gathering both lives…" />}
      {canon && a && b && map && cmp && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 text-sm mb-4">
            {[
              [a, COLOR_A, mentionYears(a)],
              [b, COLOR_B, mentionYears(b)],
            ].map(([p, color, span]) => {
              const person = p as Person
              return (
                <div key={person.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="swatch" style={{ background: color as string }} />
                    <EntityLink type="person" id={person.id} className="text-ink hover:text-accent">
                      {person.title}
                    </EntityLink>
                  </div>
                  {person.name_meaning?.meaning && (
                    <div className="text-xs text-ink-2 mt-0.5">
                      {person.name_meaning.hebrew && (
                        <span lang="he" dir="rtl" className="text-sm mr-1.5">
                          {person.name_meaning.hebrew}
                        </span>
                      )}
                      “{person.name_meaning.meaning}”
                    </div>
                  )}
                  <div className="text-ink-2 text-xs mt-1 leading-relaxed">
                    {person.verseCount.toLocaleString()} verses in {new Set(person.verses.map((o) => canon.locate(o).b)).size} books
                    {person.birth !== undefined && person.death !== undefined ? <> · lived {formatYearRange(person.birth, person.death)}</> : span ? <> · appears {formatYearRange(...(span as [number, number]))}</> : null}
                  </div>
                </div>
              )
            })}
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2 font-medium">
                <span className="swatch" style={{ background: COLOR_SHARED }} />
                Shared
              </div>
              <div className="text-ink-2 text-xs mt-1 leading-relaxed">
                {cmp.sharedVerses.length} verses together · {cmp.peopleSplit.shared.length} people · {cmp.placesSplit.shared.length} places · {cmp.sharedEv.length} events
              </div>
            </div>
          </div>

          <DualMap
            a={{ label: a.title, color: COLOR_A }}
            b={{ label: b.title, color: COLOR_B }}
            bridges={map.bridges}
            left={map.left}
            right={map.right}
            onDot={(d) => map.targets.get(d.id)?.()}
            onCenter={(which) => navigate(`/person/${which === 'a' ? a.id : b.id}`)}
          />
          <p className="text-xs text-muted mt-1">Bridges between the two hold what they share; the branches on each side hold what is theirs alone. Click a dot to open it. Only the strongest connections are drawn; the counts show the rest.</p>

          {timeline && (timeline.bands.length > 0 || timeline.items.length > 0) && (
            <Section title="In time">
              <Timeline items={timeline.items} bands={timeline.bands} onItem={(it) => navigate(`/event/${it.id}`)} />
              <div className="flex flex-wrap gap-4 mt-1 text-xs text-ink-2">
                <span className="flex items-center gap-1.5">
                  <span className="swatch" style={{ background: COLOR_A }} /> {a.title}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="swatch" style={{ background: COLOR_B }} /> {b.title}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="swatch" style={{ background: COLOR_SHARED }} /> both
                </span>
              </div>
            </Section>
          )}

          <Section title="Across the Bible">
            <CanonStrip
              canon={canon}
              series={[
                { ranges: aRanges, color: COLOR_A, label: a.title },
                { ranges: bRanges, color: COLOR_B, label: b.title },
              ]}
              caption={`Where ${a.title} and ${b.title} appear`}
            />
          </Section>
        </>
      )}
    </div>
  )
}
