import { useMemo, useState } from 'react'
import Timeline, { type TimelineItem, type TimelineLane } from './Timeline'
import { groupColor } from './Sunburst'
import { RefLink } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadEvents, loadYears } from '@/data/loaders'
import type { Bible, Study, StudyGroup, StudyRef, StudyView } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { formatYear, formatYearRange } from '@/lib/format'
import { useSession } from '@/store/session'

interface Dated {
  ref: StudyRef
  group: StudyGroup
  gi: number
  k: number
  start: number
  end: number
}

/** Where the years come from: the traditional year attached to every verse. */
function yearsOf(ranges: [number, number][], years: (number | null)[]): [number, number] | null {
  let lo = Infinity
  let hi = -Infinity
  for (const [s, e] of ranges)
    for (let o = s; o <= e; o++) {
      const y = years[o]
      if (y === null || y === undefined) continue
      if (y < lo) lo = y
      if (y > hi) hi = y
    }
  return lo === Infinity ? null : [lo, hi]
}

/** The study's references on a time axis, one row per group. */
export default function StudyTimeline({ study, view, canon, bible, selected, onRef }: { study: Study; view: StudyView; canon: Canon; bible?: Bible; selected: StudyRef | null; onRef: (ref: StudyRef, group: StudyGroup) => void }) {
  const { data: years } = useData('years', loadYears)
  const { data: events } = useData('events', loadEvents)
  const goTo = useSession((s) => s.goTo)
  const [focusDomain, setFocusDomain] = useState<[number, number] | null>(null)

  const { dated, undated } = useMemo(() => {
    const dated: Dated[] = []
    const undated: { ref: StudyRef; group: StudyGroup }[] = []
    if (!years) return { dated, undated }
    view.groups.forEach((group, gi) =>
      group.refs.forEach((ref, k) => {
        const y = yearsOf(ref.ranges, years)
        if (y) dated.push({ ref, group, gi, k, start: y[0], end: y[1] })
        else undated.push({ ref, group })
      }),
    )
    return { dated, undated }
  }, [view, years])

  const lanes = useMemo<TimelineLane[]>(() => {
    const out: TimelineLane[] = view.groups.map((g, gi) => {
      const mine = dated.filter((d) => d.gi === gi)
      const span: [number, number] | undefined = mine.length ? [Math.min(...mine.map((d) => d.start)), Math.max(...mine.map((d) => d.end))] : undefined
      return { id: g.id, label: g.title, color: groupColor(gi), span, sub: span ? formatYearRange(span[0], span[1]) : 'undated' }
    })
    return out
  }, [view, dated])

  const storyEvents = useMemo(() => {
    if (!events || !dated.length) return []
    const lo = Math.min(...dated.map((d) => d.start))
    const hi = Math.max(...dated.map((d) => d.end))
    const inStudy = (o: number) => study.ranges.some(([s, e]) => o >= s && o <= e)
    return events.filter((e) => e.year !== null && e.year >= lo && e.year <= hi && e.verses.some(inStudy)).slice(0, 40)
  }, [events, dated, study])

  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = dated.map((d) => ({
      id: `r:${d.gi}:${d.k}`,
      label: d.ref.label,
      year: d.start,
      end: d.end > d.start ? d.end : undefined,
      color: groupColor(d.gi),
      lane: d.group.id,
      sub: [d.ref.category ? study.categories?.find((c) => c.id === d.ref.category)?.title : undefined, d.ref.jesusOwn ? 'words of Jesus' : d.ref.jesus ? 'connected by Jesus' : undefined, 'click for the overview'].filter(Boolean).join(' · '),
    }))
    for (const e of storyEvents) out.push({ id: `e:${e.id}`, label: e.title, year: e.year!, color: 'var(--muted)', lane: 'events', sub: `${formatYear(e.year)} · event from the data · click to read` })
    return out
  }, [dated, storyEvents, study])

  const allLanes = useMemo<TimelineLane[]>(() => (storyEvents.length ? [...lanes, { id: 'events', label: 'Events in the story', muted: true, sub: 'from the timeline data' }] : lanes), [lanes, storyEvents])

  const initialDomain = useMemo<[number, number] | undefined>(() => {
    if (study.timeline?.from !== undefined && study.timeline?.to !== undefined) return [study.timeline.from, study.timeline.to]
    if (!dated.length) return undefined
    const ys = dated.flatMap((d) => [d.start, d.end]).sort((a, b) => a - b)
    const lo = ys[0]
    const hi = ys[ys.length - 1]
    // If one big gap splits the years, open on the busier side.
    let gapAt = -1
    let gap = 0
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > gap) (gap = ys[i] - ys[i - 1]), (gapAt = i)
    if (gap > (hi - lo) * 0.45 && gapAt > 0) {
      const left = ys.slice(0, gapAt)
      const right = ys.slice(gapAt)
      const side = left.length >= right.length ? left : right
      const a = side[0]
      const b = side[side.length - 1]
      const pad = Math.max(3, (b - a) * 0.08)
      return [a - pad, b + pad]
    }
    return undefined
  }, [study, dated])

  const byId = useMemo(() => new Map(dated.map((d) => [`r:${d.gi}:${d.k}`, d])), [dated])
  const eventById = useMemo(() => new Map(storyEvents.map((e) => [`e:${e.id}`, e])), [storyEvents])
  const selectedId = useMemo(() => {
    if (!selected) return null
    const d = dated.find((x) => x.ref === selected)
    return d ? `r:${d.gi}:${d.k}` : null
  }, [selected, dated])

  if (!years) return <div className="text-muted text-sm py-6">Loading the years…</div>

  return (
    <div>
      <Timeline
        items={items}
        lanes={allLanes}
        initialDomain={initialDomain}
        focusDomain={focusDomain}
        selectedId={selectedId}
        onItem={(it) => {
          const d = byId.get(it.id)
          if (d) {
            onRef(d.ref, d.group)
            goTo(d.ref.ranges[0][0], { pane: false })
            return
          }
          const e = eventById.get(it.id)
          if (e?.verses.length) goTo(e.verses[0])
        }}
        onLane={(lane) => {
          if (lane.span) {
            const pad = Math.max(3, (lane.span[1] - lane.span[0]) * 0.08)
            setFocusDomain([lane.span[0] - pad, lane.span[1] + pad])
          }
        }}
      />
      <p className="text-xs text-muted mt-1">
        Each row is a theme of the study; each dot is a reference placed by the traditional year of its verses, so the story reads left to right and the themes top to bottom. Click a dot for its overview, a row title to zoom to that theme.
        {study.timeline?.note ? ` ${study.timeline.note}` : ''}
      </p>
      {undated.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
          <span>Without a year in the data:</span>
          {undated.map(({ ref, group }, i) => (
            <RefLink key={i} range={ref.ranges[0]} canon={canon} label={ref.label} color={groupColor(view.groups.indexOf(group))} />
          ))}
        </div>
      )}
      {bible && null}
    </div>
  )
}
