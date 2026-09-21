import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import ConnectionMap, { type MapBranch } from '@/components/viz/ConnectionMap'
import CanonStrip from '@/components/viz/CanonStrip'
import { Popover, type PopoverState } from '@/components/common/Popover'
import { EntityLink, Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadEntities, loadEvents, loadPeopleIndex, loadPlacesIndex, loadStudiesIndex, loadXrefs } from '@/data/loaders'
import type { Bible } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { PARTS, partColor, partOf, studiesTouching, xrefsFrom, type Xref } from '@/lib/connections'
import { truncate } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { usePageTitle, useSession } from '@/store/session'

/** How many chapters one branch of the map draws. */
const PER_BRANCH = 10

interface Target {
  /** first verse of the chapter the links land in */
  start: number
  end: number
  weight: number
  links: Xref[]
}

/** The right pane's resting view: the chapter open in the reader, and how it connects to the rest of the Bible. */
export default function ChapterPage() {
  usePageTitle('This chapter')
  const { data: canon } = useData('canon', loadCanon)
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const readerOrdinal = useSession((s) => s.readerOrdinal)
  if (!canon || !bible) return <div className="p-6"><Loading /></div>
  const { b, c } = canon.locate(readerOrdinal)
  return <ChapterBody canon={canon} bible={bible} b={b} c={c} />
}

function ChapterBody({ canon, bible, b, c }: { canon: Canon; bible: Bible; b: number; c: number }) {
  const book = canon.book(b)
  const start = canon.chapterStart(b, c)
  const end = canon.chapterEnd(b, c)
  const title = canon.rangeLabel(start, end)
  const { data: xrefs } = useData(`xrefs:${book.osis}`, () => loadXrefs(book.osis))
  const { data: ents } = useData(`entities:${book.osis}`, () => loadEntities(book.osis))
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const { data: events } = useData('events', loadEvents)
  const { data: studyIndex } = useData('studies-index', loadStudiesIndex)
  const goTo = useSession((s) => s.goTo)
  const selectVerse = useSession((s) => s.selectVerse)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const welcomed = useSettings((s) => s.welcomed)
  const set = useSettings((s) => s.set)

  const links = useMemo(() => (xrefs ? xrefsFrom(xrefs, start, end) : []), [xrefs, start, end])

  // Links grouped by the chapter they land in, then by part of the Bible.
  const { branches, targets, byPart } = useMemo(() => {
    const byChapter = new Map<number, Target>()
    for (const l of links) {
      const at = canon.locate(l.start)
      const cs = canon.chapterStart(at.b, at.c)
      if (cs === start) continue
      let t = byChapter.get(cs)
      if (!t) byChapter.set(cs, (t = { start: cs, end: canon.chapterEnd(at.b, at.c), weight: 0, links: [] }))
      t.weight += Math.max(l.votes, 1)
      t.links.push(l)
    }
    const byPart = PARTS.map(() => [] as Target[])
    for (const t of byChapter.values()) byPart[partOf(canon, t.start)].push(t)
    for (const list of byPart) list.sort((x, y) => y.weight - x.weight)
    const max = Math.max(1, ...byPart.map((l) => l[0]?.weight ?? 0))
    const branches: MapBranch[] = PARTS.map((p, i) => ({
      id: p.id,
      title: p.title,
      color: partColor(i),
      dots: byPart[i].slice(0, PER_BRANCH).map((t) => ({
        id: String(t.start),
        label: canon.rangeLabel(t.start, t.end, 'short'),
        color: partColor(i),
        r: 3 + 6 * Math.sqrt(t.weight / max),
        solid: t.weight >= max / 3,
        sub: `${t.links.length} link${t.links.length === 1 ? '' : 's'} from ${title}`,
      })),
    })).filter((br) => br.dots.length)
    return { branches, targets: byChapter, byPart }
  }, [links, canon, start, title])

  // The verses here with the most links out.
  const busiest = useMemo(() => {
    const counts: { o: number; n: number }[] = []
    for (let o = start; o <= end; o++) {
      const n = xrefs?.[o]?.length ?? 0
      if (n) counts.push({ o, n })
    }
    return counts.sort((x, y) => y.n - x.n).slice(0, 5)
  }, [xrefs, start, end])

  const named = useMemo(() => {
    const p = new Map<string, number>()
    const l = new Map<string, number>()
    for (let o = start; o <= end; o++) {
      const [pIds, lIds] = ents?.[o] ?? [[], []]
      for (const id of pIds) p.set(id, (p.get(id) ?? 0) + 1)
      for (const id of lIds) l.set(id, (l.get(id) ?? 0) + 1)
    }
    const sorted = (m: Map<string, number>) => [...m].sort((x, y) => y[1] - x[1])
    return { people: sorted(p), places: sorted(l) }
  }, [ents, start, end])
  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])

  const here = useMemo(() => (events ?? []).filter((e) => e.verses.some((o) => o >= start && o <= end)).sort((x, y) => x.sort - y.sort), [events, start, end])
  const studies = useMemo(() => (studyIndex ? studiesTouching(studyIndex, start, end) : []), [studyIndex, start, end])
  const outline = useMemo(() => {
    const out: { o: number; text: string }[] = []
    for (let o = start; o <= end; o++) if (bible.headings?.[o]) out.push({ o, text: bible.headings[o] })
    return out
  }, [bible, start, end])

  const reach = useMemo(() => links.map((l) => [l.start, l.end] as [number, number]), [links])
  const maxBusy = busiest[0]?.n ?? 1

  return (
    <div className="p-6 @container">
      {!welcomed && <Welcome onDone={() => set({ welcomed: true })} />}
      <PageHeader
        kicker="This chapter"
        title={title}
        subtitle={
          <>
            {end - start + 1} verses
            {xrefs && <> · {links.length.toLocaleString()} cross references to {targets.size} other chapters</>}
            {named.people.length > 0 && <> · {named.people.length} {named.people.length === 1 ? 'person' : 'people'}</>}
            {named.places.length > 0 && <> · {named.places.length} place{named.places.length === 1 ? '' : 's'}</>}
          </>
        }
      />
      {welcomed && <p className="text-sm text-ink-2 max-w-prose -mt-2">This pane follows the Bible. Pick any verse there to map where it connects.</p>}

      {outline.length > 1 && (
        <Section title="In this chapter">
          <ol className="text-sm space-y-0.5">
            {outline.map((h) => (
              <li key={h.o}>
                <button type="button" className="text-left hover:text-accent" onClick={() => goTo(h.o, { history: 'replace' })}>
                  <span className="text-muted tabular-nums inline-block w-7">{h.o - start + 1}</span>
                  {h.text}
                </button>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {!xrefs ? (
        <Loading />
      ) : branches.length > 0 ? (
        <Section title="Where it connects" count={targets.size}>
          <ConnectionMap
            center={{ label: title }}
            branches={branches}
            canBack={false}
            height={520}
            hint="Each line is a part of the Bible, each dot a chapter this one links to; bigger dots have more links. Click one to see them."
            dotHint="click to see the links"
            onDot={(d, _b, at) => {
              const t = targets.get(Number(d.id))
              if (!t) return
              const top = [...t.links].sort((x, y) => y.votes - x.votes)
              setPopover({
                x: at.x,
                y: at.y,
                title: `${canon.rangeLabel(t.start, t.end)}: ${t.links.length} link${t.links.length === 1 ? '' : 's'}`,
                body: (
                  <span className="block mt-1 space-y-1 max-h-56 overflow-y-auto">
                    {top.slice(0, 8).map((l, i) => (
                      <button key={i} type="button" className="block w-full text-left rounded px-1 -mx-1 hover:bg-surface-2" onClick={() => goTo(l.start)}>
                        <span className="text-xs text-muted">{canon.label(l.from, 'short')} → </span>
                        <span className="text-xs font-medium text-ink">{canon.rangeLabel(l.start, l.end, 'short')}</span>
                        <span className="block text-xs leading-snug font-serif">{truncate(bible.verses[l.start], 90)}</span>
                      </button>
                    ))}
                  </span>
                ),
                action: {
                  label: `Read ${canon.rangeLabel(top[0].start, top[0].end, 'short')}`,
                  run: () => {
                    setPopover(null)
                    goTo(top[0].start)
                  },
                },
              })
            }}
            onBranch={(br, at) => {
              const list = byPart[PARTS.findIndex((p) => p.id === br.id)] ?? []
              const n = list.reduce((s, t) => s + t.links.length, 0)
              setPopover({
                x: at.x,
                y: at.y,
                title: `${br.title}: ${n} link${n === 1 ? '' : 's'} to ${list.length} chapter${list.length === 1 ? '' : 's'}`,
                body: (
                  <span className="flex flex-wrap gap-1 mt-1">
                    {list.slice(0, 18).map((t) => (
                      <button key={t.start} type="button" className="chip chip-link" onClick={() => goTo(t.start, { focus: false })}>
                        {canon.rangeLabel(t.start, t.end, 'short')}
                      </button>
                    ))}
                  </span>
                ),
              })
            }}
            onCenter={() => {}}
          />
        </Section>
      ) : (
        <p className="mt-6 text-sm text-muted">No recorded cross references leave this chapter.</p>
      )}

      {busiest.length > 0 && (
        <Section title="Its most connected verses">
          <ul className="max-w-prose -mx-2">
            {busiest.map(({ o, n }) => (
              <li key={o}>
                <button type="button" className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface-2 flex gap-3 items-start" onClick={() => selectVerse(o)} title={`Map ${canon.label(o)}`}>
                  <span className="w-20 shrink-0">
                    <span className="block text-sm font-medium leading-tight">{canon.label(o, 'short')}</span>
                    <span className="block h-1 mt-1 rounded-full bg-[var(--series-1)]" style={{ width: `${Math.max(8, (n / maxBusy) * 100)}%`, opacity: 0.85 }} aria-hidden />
                    <span className="block text-[11px] text-muted mt-0.5">{n} links</span>
                  </span>
                  <span className="text-[13px] text-ink-2 leading-snug">{truncate(bible.verses[o], 130)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(named.people.length > 0 || named.places.length > 0) && (
        <Section title="Who and where">
          <div className="flex flex-wrap gap-1.5">
            {named.people.map(([id, n]) => (
              <EntityLink key={id} type="person" id={id}>
                {personName.get(id) ?? id}
                {n > 1 && <span className="text-muted">{n}</span>}
              </EntityLink>
            ))}
            {named.places.map(([id, n]) => (
              <EntityLink key={id} type="place" id={id}>
                <span className="text-muted">◎</span> {placeName.get(id) ?? id}
                {n > 1 && <span className="text-muted">{n}</span>}
              </EntityLink>
            ))}
          </div>
        </Section>
      )}

      {here.length > 0 && (
        <Section title="What happens here" count={here.length}>
          <div className="flex flex-wrap gap-1.5">
            {here.map((e) => (
              <EntityLink key={e.id} type="event" id={e.id}>
                {e.title}
              </EntityLink>
            ))}
          </div>
        </Section>
      )}

      {studies.length > 0 && (
        <Section title="Studies that pass through" count={studies.length}>
          <div className="grid gap-2 @xl:grid-cols-2">
            {studies.map((s) => (
              <Link key={s.id} to={`/study/${s.id}`} className="block rounded-xl border border-line bg-surface px-3 py-2 hover:border-line-strong hover:no-underline text-ink">
                <div className="font-medium">{s.title}</div>
                {s.subtitle && <div className="text-xs text-ink-2">{s.subtitle}</div>}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {reach.length > 0 && (
        <Section title="Its reach across the Bible">
          <CanonStrip canon={canon} ranges={reach} caption={`Every verse ${title} links to, on the 66 books. Click a book to open it up.`} />
        </Section>
      )}
      <Popover state={popover} onClose={() => setPopover(null)} />
    </div>
  )
}

/** A first-visit note on how the panes work. */
function Welcome({ onDone }: { onDone: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 mb-6 max-w-prose">
      <div className="font-semibold text-base">See how the story connects.</div>
      <p className="text-sm text-ink-2 mt-1 leading-relaxed">
        This pane follows the Bible as you read. Pick any verse to see where it connects across the whole Bible. Search a person, a place or a theme, or open a study, and it opens here while you keep reading.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <Link to="/studies" className="btn btn-primary hover:no-underline">
          Browse the studies
        </Link>
        <button type="button" className="btn" onClick={onDone}>
          Got it
        </button>
      </div>
    </div>
  )
}
