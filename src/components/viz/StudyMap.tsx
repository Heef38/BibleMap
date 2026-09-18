import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import ConnectionMap, { type MapBranch, type MapDot } from './ConnectionMap'
import { categoryColor } from './ArcDiagram'
import { groupColor } from './Sunburst'
import { Popover, type PopoverState } from '@/components/common/Popover'
import { RefLink } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadEntities, loadEvents, loadPeopleIndex, loadPerson, loadPlace, loadPlacesIndex, loadXrefs } from '@/data/loaders'
import type { Bible, Study, StudyLink, StudyRef, StudyView } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { formatYear, truncate } from '@/lib/format'
import { ordinalsToRanges, type Range } from '@/lib/refs'
import { useSession } from '@/store/session'

type Focus =
  | { kind: 'study' }
  | { kind: 'group'; id: string }
  | { kind: 'ref'; groupId: string; index: number }
  | { kind: 'passage'; ranges: Range[]; label: string; note?: string }
  | { kind: 'person'; id: string }
  | { kind: 'place'; id: string }

const MUTED = 'var(--muted)'
const CAP = 12

function overlaps(a: Range[], b: Range[]): boolean {
  for (const [s, e] of a) for (const [s2, e2] of b) if (s <= e2 && s2 <= e) return true
  return false
}

export default function StudyMap({ study, view, canon, bible }: { study: Study; view: StudyView; canon: Canon; bible?: Bible }) {
  const [trail, setTrail] = useState<Focus[]>([{ kind: 'study' }])
  const [showAuto, setShowAuto] = useState(true)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const goTo = useSession((s) => s.goTo)
  const focus = trail[trail.length - 1]

  useEffect(() => {
    setTrail([{ kind: 'study' }])
  }, [view.id])

  const groups = view.groups
  const groupIndex = (id: string) => groups.findIndex((g) => g.id === id)
  const refOf = (f: Focus): StudyRef | null => (f.kind === 'ref' ? (groups[groupIndex(f.groupId)]?.refs[f.index] ?? null) : null)
  const focusRef = refOf(focus)
  const focusRanges: Range[] | null = focus.kind === 'passage' ? focus.ranges : focusRef ? focusRef.ranges : null
  const bookOsis = focusRanges ? canon.book(canon.locate(focusRanges[0][0]).b).osis : null

  const { data: xrefs } = useData(bookOsis && showAuto ? `xrefs:${bookOsis}` : null, () => loadXrefs(bookOsis!))
  const { data: ents } = useData(bookOsis && showAuto ? `entities:${bookOsis}` : null, () => loadEntities(bookOsis!))
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const { data: events } = useData('events', loadEvents)
  const personId = focus.kind === 'person' ? focus.id : null
  const placeId = focus.kind === 'place' ? focus.id : null
  const { data: person } = useData(personId ? `person:${personId}` : null, () => loadPerson(personId!))
  const { data: place } = useData(placeId ? `place:${placeId}` : null, () => loadPlace(placeId!))

  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])
  const personMeaning = useMemo(() => new Map(people?.filter((p) => p.meaning).map((p) => [p.id, p.meaning!]) ?? []), [people])
  const placeMeaning = useMemo(() => new Map(places?.filter((p) => p.meaning).map((p) => [p.id, p.meaning!]) ?? []), [places])

  const snip = (ranges: Range[]) => (bible ? truncate(bible.verses[ranges[0][0]] || '', 140) : undefined)
  const catTitle = (id?: string) => (id ? study.categories?.find((c) => c.id === id)?.title : undefined)
  const dotColorFor = (r: StudyRef, gi: number) => (study.categories && r.category ? categoryColor(study.categories, r.category) : groupColor(gi))
  const linkColor = (l: StudyLink, fallback: string) => (study.categories && l.category ? categoryColor(study.categories, l.category) : fallback)

  const { branches, targets, branchTargets } = useMemo(() => {
    const targets = new Map<string, Focus>()
    const branchTargets = new Map<string, Focus>()
    const branches: MapBranch[] = []
    const refDot = (r: StudyRef, id: string, color: string): MapDot => ({
      id,
      label: r.label,
      color,
      r: r.weight >= 3 ? 6.5 : 4.5,
      solid: r.jesus,
      sub: [catTitle(r.category), r.jesusOwn ? 'words of Jesus' : r.jesus ? 'connected by Jesus' : undefined, `weight ${r.weight}`].filter(Boolean).join(' · '),
      note: r.note,
      snippet: snip(r.ranges),
    })
    const linkDot = (l: StudyLink, id: string, color: string): MapDot => ({
      id,
      label: l.label,
      color: linkColor(l, color),
      r: l.jesus ? 6 : 4.5,
      solid: l.jesus,
      sub: [catTitle(l.category), l.topic].filter(Boolean).join(' · '),
      note: l.note,
      snippet: snip(l.ranges),
    })
    const autoBranches = (ranges: Range[]) => {
      if (!showAuto) return
      // cross references, best votes first, excluding the passage itself
      if (xrefs) {
        const seen = new Map<number, [number, number, number]>()
        let n = 0
        for (const [s, e] of ranges)
          for (let o = s; o <= e && n < 80; o++, n++)
            for (const x of xrefs[o] ?? []) {
              if (overlaps([[x[0], x[1]]], ranges)) continue
              const prev = seen.get(x[0])
              if (!prev || prev[2] < x[2]) seen.set(x[0], x)
            }
        const top = [...seen.values()].sort((a, b) => b[2] - a[2]).slice(0, CAP)
        if (top.length) {
          const dots = top.map((x, i) => {
            const id = `x:${i}`
            targets.set(id, { kind: 'passage', ranges: [[x[0], x[1]]], label: canon.rangeLabel(x[0], x[1]) })
            return { id, label: canon.rangeLabel(x[0], x[1], 'short'), color: MUTED, r: 4.5, sub: `${x[2]} votes`, snippet: snip([[x[0], x[1]]]) }
          })
          branches.push({ id: 'auto:xrefs', title: 'Cross references', note: 'The passages readers most often connect with this one, from the OpenBible.info cross-reference votes.', color: MUTED, muted: true, dots })
        }
      }
      if (ents) {
        const pc = new Map<string, number>()
        const lc = new Map<string, number>()
        for (const [s, e] of ranges)
          for (let o = s; o <= e; o++) {
            const row = ents[o]
            if (!row) continue
            for (const p of row[0]) pc.set(p, (pc.get(p) ?? 0) + 1)
            for (const l of row[1]) lc.set(l, (lc.get(l) ?? 0) + 1)
          }
        const topP = [...pc.entries()].sort((a, b) => b[1] - a[1]).slice(0, CAP)
        const topL = [...lc.entries()].sort((a, b) => b[1] - a[1]).slice(0, CAP)
        if (topP.length)
          branches.push({
            id: 'auto:people',
            title: 'People',
            note: 'Everyone named in this passage.',
            color: MUTED,
            muted: true,
            dots: topP.map(([id, n]) => {
              targets.set(`p:${id}`, { kind: 'person', id })
              return { id: `p:${id}`, label: personName.get(id) ?? id, color: MUTED, r: 4.5, sub: [personMeaning.get(id) ? `“${personMeaning.get(id)}”` : undefined, `${n} verse${n === 1 ? '' : 's'}`].filter(Boolean).join(' · ') }
            }),
          })
        if (topL.length)
          branches.push({
            id: 'auto:places',
            title: 'Places',
            note: 'Every place named in this passage.',
            color: MUTED,
            muted: true,
            dots: topL.map(([id, n]) => {
              targets.set(`l:${id}`, { kind: 'place', id })
              return { id: `l:${id}`, label: placeName.get(id) ?? id, color: MUTED, r: 4.5, sub: [placeMeaning.get(id) ? `“${placeMeaning.get(id)}”` : undefined, `${n} verse${n === 1 ? '' : 's'}`].filter(Boolean).join(' · ') }
            }),
          })
      }
    }
    const inStudyBranch = (ranges: Range[], exclude?: StudyRef) => {
      const dots: MapDot[] = []
      groups.forEach((g, gi) =>
        g.refs.forEach((r, k) => {
          if (r === exclude || !overlaps(r.ranges, ranges)) return
          const id = `s:${gi}:${k}`
          targets.set(id, { kind: 'ref', groupId: g.id, index: k })
          dots.push(refDot(r, id, dotColorFor(r, gi)))
        }),
      )
      if (dots.length) branches.push({ id: 'study', title: 'In this study', note: 'References in this study that overlap the passage.', color: 'var(--accent)', dots })
    }

    if (focus.kind === 'study') {
      groups.forEach((g, gi) => {
        branchTargets.set(`g:${g.id}`, { kind: 'group', id: g.id })
        branches.push({
          id: `g:${g.id}`,
          title: g.title,
          note: g.note,
          color: groupColor(gi),
          focusable: true,
          dots: g.refs.map((r, k) => {
            const id = `r:${gi}:${k}`
            targets.set(id, { kind: 'ref', groupId: g.id, index: k })
            return refDot(r, id, dotColorFor(r, gi))
          }),
        })
      })
    } else if (focus.kind === 'group') {
      const gi = groupIndex(focus.id)
      const g = groups[gi]
      g?.refs.forEach((r, k) => {
        const id = `ref:${k}`
        branchTargets.set(id, { kind: 'ref', groupId: g.id, index: k })
        branches.push({
          id,
          title: r.label,
          note: r.note,
          color: dotColorFor(r, gi),
          focusable: true,
          dots: (r.links ?? []).map((l, j) => {
            const did = `${id}:l${j}`
            targets.set(did, { kind: 'passage', ranges: l.ranges, label: l.label, note: l.note })
            return linkDot(l, did, dotColorFor(r, gi))
          }),
        })
      })
    } else if (focus.kind === 'ref' && focusRef) {
      const gi = groupIndex(focus.groupId)
      const byTopic = new Map<string, StudyLink[]>()
      for (const l of focusRef.links ?? []) {
        const key = l.topic ?? catTitle(l.category) ?? 'Related passages'
        ;(byTopic.get(key) ?? byTopic.set(key, []).get(key)!).push(l)
      }
      let ti = 0
      for (const [topic, links] of byTopic) {
        const id = `t:${ti++}`
        branches.push({
          id,
          title: topic,
          note: links.find((l) => l.note)?.note,
          color: linkColor(links[0], groupColor(gi)),
          dots: links.map((l, j) => {
            const did = `${id}:${j}`
            targets.set(did, { kind: 'passage', ranges: l.ranges, label: l.label, note: l.note })
            return linkDot(l, did, groupColor(gi))
          }),
        })
      }
      autoBranches(focusRef.ranges)
    } else if (focus.kind === 'passage') {
      inStudyBranch(focus.ranges)
      autoBranches(focus.ranges)
    } else if (focus.kind === 'person' && person) {
      const fam: [string, string[]][] = [
        ['father', person.father],
        ['mother', person.mother],
        ['spouse', person.partners],
        ['child', person.children],
        ['sibling', person.siblings.slice(0, 6)],
      ]
      const famDots: MapDot[] = []
      for (const [rel, ids] of fam)
        for (const id of ids) {
          targets.set(`p:${id}`, { kind: 'person', id })
          famDots.push({ id: `p:${id}`, label: personName.get(id) ?? id, color: 'var(--series-1)', r: 4.5, sub: [rel, personMeaning.get(id) ? `“${personMeaning.get(id)}”` : undefined].filter(Boolean).join(' · ') })
        }
      if (famDots.length) branches.push({ id: 'family', title: 'Family', color: 'var(--series-1)', dots: famDots })
      const evs = (events ?? []).filter((e) => e.participants.includes(person.id)).slice(0, CAP)
      if (evs.length)
        branches.push({
          id: 'events',
          title: 'Events',
          color: 'var(--series-4)',
          dots: evs.map((e) => {
            const id = `e:${e.id}`
            if (e.verses.length) targets.set(id, { kind: 'passage', ranges: ordinalsToRanges(e.verses).slice(0, 1), label: e.title })
            return { id, label: e.title, color: 'var(--series-4)', r: 4.5, sub: formatYear(e.year) }
          }),
        })
      const vr = ordinalsToRanges(person.verses).slice(0, CAP)
      if (vr.length)
        branches.push({
          id: 'verses',
          title: `Verses (${person.verseCount})`,
          note: `The first ${vr.length} passages that mention ${person.title}. The person page lists them all.`,
          color: 'var(--series-3)',
          dots: vr.map((r, i) => {
            const id = `v:${i}`
            targets.set(id, { kind: 'passage', ranges: [r], label: canon.rangeLabel(r[0], r[1]) })
            return { id, label: canon.rangeLabel(r[0], r[1], 'short'), color: 'var(--series-3)', r: 4.5, snippet: snip([r]) }
          }),
        })
    } else if (focus.kind === 'place' && place) {
      const evs = (events ?? []).filter((e) => e.locations.includes(place.id)).slice(0, CAP)
      if (evs.length)
        branches.push({
          id: 'events',
          title: 'Events here',
          color: 'var(--series-4)',
          dots: evs.map((e) => {
            const id = `e:${e.id}`
            if (e.verses.length) targets.set(id, { kind: 'passage', ranges: ordinalsToRanges(e.verses).slice(0, 1), label: e.title })
            return { id, label: e.title, color: 'var(--series-4)', r: 4.5, sub: formatYear(e.year) }
          }),
        })
      const pp = [...place.peopleBorn.map((id) => [id, 'born here'] as const), ...place.peopleDied.map((id) => [id, 'died here'] as const)].slice(0, CAP)
      if (pp.length)
        branches.push({
          id: 'people',
          title: 'People',
          color: 'var(--series-1)',
          dots: pp.map(([id, rel]) => {
            targets.set(`p:${id}`, { kind: 'person', id })
            return { id: `p:${id}`, label: personName.get(id) ?? id, color: 'var(--series-1)', r: 4.5, sub: rel }
          }),
        })
      const vr = ordinalsToRanges(place.verses).slice(0, CAP)
      if (vr.length)
        branches.push({
          id: 'verses',
          title: `Verses (${place.verseCount})`,
          color: 'var(--series-3)',
          dots: vr.map((r, i) => {
            const id = `v:${i}`
            targets.set(id, { kind: 'passage', ranges: [r], label: canon.rangeLabel(r[0], r[1]) })
            return { id, label: canon.rangeLabel(r[0], r[1], 'short'), color: 'var(--series-3)', r: 4.5, snippet: snip([r]) }
          }),
        })
    }
    return { branches, targets, branchTargets }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, groups, xrefs, ents, person, place, events, personName, placeName, personMeaning, placeMeaning, showAuto, bible])

  const labelOf = (f: Focus): string => {
    switch (f.kind) {
      case 'study':
        return study.title
      case 'group':
        return groups[groupIndex(f.id)]?.title ?? f.id
      case 'ref':
        return refOf(f)?.label ?? 'Reference'
      case 'passage':
        return f.label
      case 'person':
        return personName.get(f.id) ?? person?.title ?? f.id
      case 'place':
        return placeName.get(f.id) ?? place?.name ?? f.id
    }
  }

  const push = (f: Focus) => {
    setPopover(null)
    setTrail((t) => [...t, f])
    if (f.kind === 'ref') {
      const r = refOf(f)
      if (r) goTo(r.ranges[0][0], { pane: false })
    } else if (f.kind === 'passage') goTo(f.ranges[0][0], { pane: false })
  }
  const back = () => {
    setPopover(null)
    setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t))
  }

  const centerSub =
    focus.kind === 'study' ? `${groups.length} groups · ${groups.reduce((s, g) => s + g.refs.length, 0)} references` : focus.kind === 'group' ? `${groups[groupIndex(focus.id)]?.refs.length ?? 0} references` : undefined

  const focusNote = focus.kind === 'group' ? groups[groupIndex(focus.id)]?.note : focus.kind === 'ref' ? focusRef?.note : focus.kind === 'passage' ? focus.note : focus.kind === 'study' ? view.note : undefined
  const focusText = focusRanges && bible ? truncate(focusRanges.map(([s, e]) => bible.verses.slice(s, Math.min(e, s + 6) + 1).join(' ')).join(' … '), 420) : undefined

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] items-start">
        <ConnectionMap
          center={{ label: labelOf(focus), sub: centerSub }}
          branches={branches}
          canBack={trail.length > 1}
          onDot={(d) => {
            const t = targets.get(d.id)
            if (t) push(t)
          }}
          onBranch={(b, at) => {
            const t = branchTargets.get(b.id)
            setPopover({
              x: at.x,
              y: at.y,
              title: b.title,
              body: b.note ?? `${b.dots.length} connection${b.dots.length === 1 ? '' : 's'}`,
              action: t ? { label: 'Zoom in', run: () => push(t) } : undefined,
            })
          }}
          onCenter={back}
        />
        <div className="rounded-xl border border-line bg-surface p-4 text-sm">
          <div className="flex flex-wrap gap-1 mb-2">
            {trail.map((f, i) => (
              <button key={i} type="button" className={`chip ${i < trail.length - 1 ? 'chip-link' : ''}`} aria-current={i === trail.length - 1 ? 'true' : undefined} onClick={() => i < trail.length - 1 && setTrail(trail.slice(0, i + 1))}>
                {truncate(labelOf(f), 26)}
              </button>
            ))}
          </div>
          <div className="kicker">{focus.kind === 'ref' ? 'Reference' : focus.kind}</div>
          <h3 className="font-semibold text-base leading-tight mt-0.5">{labelOf(focus)}</h3>
          {focusNote && <p className="text-ink-2 mt-1 leading-snug">{focusNote}</p>}
          {focusText && <p className="scripture !text-[14.5px] !leading-snug mt-2">{focusText}</p>}
          {focus.kind === 'ref' && focusRef?.links?.length ? (
            <div className="mt-3 space-y-1.5">
              {[...new Set(focusRef.links.map((l) => l.topic ?? catTitle(l.category) ?? 'Related passages'))].map((topic) => (
                <div key={topic}>
                  <div className="text-xs text-ink-2 mb-0.5">{topic}</div>
                  <div className="flex flex-wrap gap-1">
                    {focusRef.links!
                      .filter((l) => (l.topic ?? catTitle(l.category) ?? 'Related passages') === topic)
                      .map((l, i) => (
                        <RefLink key={i} range={l.ranges[0]} canon={canon} label={l.label} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 mt-3">
            {focusRanges && (
              <button type="button" className="btn btn-primary" onClick={() => goTo(focusRanges[0][0])}>
                Read {canon.rangeLabel(focusRanges[0][0], focusRanges[0][1], 'short')}
              </button>
            )}
            {focus.kind === 'person' && (
              <Link to={`/person/${focus.id}`} className="btn">
                Person page
              </Link>
            )}
            {focus.kind === 'place' && (
              <Link to={`/place/${focus.id}`} className="btn">
                Place page
              </Link>
            )}
            {trail.length > 1 && (
              <button type="button" className="btn" onClick={back}>
                ← Back
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 mt-3 text-xs text-ink-2">
            <input type="checkbox" checked={showAuto} onChange={(e) => setShowAuto(e.target.checked)} />
            Show automatic connections (cross references, people, places)
          </label>
        </div>
      </div>
      <Popover state={popover} onClose={() => setPopover(null)} />
    </div>
  )
}
