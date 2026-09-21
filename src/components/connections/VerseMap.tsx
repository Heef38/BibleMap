import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import ConnectionMap, { type MapBranch } from '@/components/viz/ConnectionMap'
import { Loading, Section } from '@/components/common/ui'
import { VerseEntities, XrefList } from '@/components/reader/VerseConnections'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadStudiesIndex, loadXrefs } from '@/data/loaders'
import type { Bible } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { PARTS, partColor, partOf, studiesTouching } from '@/lib/connections'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

/** How many cross references one branch of the map draws (the list below has them all). */
const PER_BRANCH = 12

/** A verse picked in the reader: where it connects across the Bible, drawn as a map, then listed. */
export default function VerseMap({ ordinal }: { ordinal: number }) {
  const { data: canon } = useData('canon', loadCanon)
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  if (!canon || !bible) return <div className="p-6"><Loading /></div>
  return <VerseMapBody ordinal={ordinal} canon={canon} bible={bible} />
}

/** Where the map is looking: the whole verse, or one part of the Bible spread out by book. */
type Zoom = number | null

function VerseMapBody({ ordinal, canon, bible }: { ordinal: number; canon: Canon; bible: Bible }) {
  const book = canon.book(canon.locate(ordinal).b)
  const { data: xrefs } = useData(`xrefs:${book.osis}`, () => loadXrefs(book.osis))
  const { data: studyIndex } = useData('studies-index', loadStudiesIndex)
  const goTo = useSession((s) => s.goTo)
  const centerMap = useSession((s) => s.centerMap)
  const [zoom, setZoom] = useState<Zoom>(null)
  // The verses followed from dot to dot, so the center can step back along them.
  const [trail, setTrail] = useState<number[]>([ordinal])
  const nextTrail = useRef<number[] | null>(null)

  useEffect(() => {
    setZoom(null)
    const planned = nextTrail.current
    nextTrail.current = null
    setTrail((t) => {
      if (planned && planned[planned.length - 1] === ordinal) return planned
      if (t[t.length - 1] === ordinal) return t
      if (t[t.length - 2] === ordinal) return t.slice(0, -1) // the browser's Back
      return [ordinal]
    })
  }, [ordinal])

  const follow = (to: number, path: number[]) => {
    nextTrail.current = path
    centerMap(to)
  }

  const refs = useMemo(() => xrefs?.[ordinal] ?? [], [xrefs, ordinal])
  const studies = useMemo(() => (studyIndex ? studiesTouching(studyIndex, ordinal, ordinal) : []), [studyIndex, ordinal])

  const branches = useMemo(() => {
    const max = Math.max(1, refs[0]?.[2] ?? 1)
    const dot = ([s, e, votes]: [number, number, number], color: string) => ({
      id: `${s}-${e}`,
      label: canon.rangeLabel(s, e, 'short'),
      color,
      r: 3 + 5 * Math.sqrt(Math.max(votes, 0) / max),
      solid: votes >= max / 3,
      snippet: bible.verses[s],
    })
    const byPart = PARTS.map(() => [] as [number, number, number][])
    for (const r of refs) byPart[partOf(canon, r[0])].push(r)
    if (zoom === null)
      return PARTS.map(
        (p, i): MapBranch => ({
          id: p.id,
          title: p.title,
          color: partColor(i),
          focusable: true,
          count: byPart[i].length,
          // strongest nearest the center
          dots: byPart[i].slice(0, PER_BRANCH).map((r) => dot(r, partColor(i))),
        }),
      ).filter((b) => b.dots.length)
    // One part, a branch per book, every link drawn.
    const byBook = new Map<number, [number, number, number][]>()
    for (const r of byPart[zoom]) {
      const b = canon.locate(r[0]).b
      ;(byBook.get(b) ?? byBook.set(b, []).get(b)!).push(r)
    }
    return [...byBook].map(
      ([b, list]): MapBranch => ({ id: `book:${b}`, title: canon.book(b).name, color: partColor(zoom), dots: list.slice(0, 20).map((r) => dot(r, partColor(zoom))), count: list.length }),
    )
  }, [refs, canon, bible, zoom])

  const label = canon.label(ordinal)
  const short = canon.label(ordinal, 'short')

  return (
    <div className="p-6 @container">
      <div className="kicker mb-1">Verse</div>
      <h1 className="text-2xl font-semibold leading-tight tracking-tight">{label}</h1>
      <p className="scripture !mx-0 mt-2 max-w-prose">{bible.verses[ordinal]}</p>
      <div className="mt-3">
        <VerseEntities ordinal={ordinal} canon={canon} />
      </div>
      {studies.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted mr-1">In {studies.length === 1 ? 'the study' : 'the studies'}</span>
          {studies.map((s) => (
            <Link key={s.id} to={`/study/${s.id}`} className="chip chip-link">
              {s.title}
            </Link>
          ))}
        </div>
      )}

      {!xrefs ? (
        <Loading />
      ) : refs.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No recorded cross references for this verse.</p>
      ) : (
        <>
          <Section title="Where it connects" count={refs.length}>
            {trail.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 mb-2" aria-label="Verses followed">
                {trail.map((o, i) => {
                  const here = i === trail.length - 1
                  return (
                    <button key={i} type="button" className={`chip ${here ? '' : 'chip-link'}`} aria-current={here ? 'true' : undefined} disabled={here} onClick={() => follow(o, trail.slice(0, i + 1))}>
                      {canon.label(o, 'short')}
                    </button>
                  )
                })}
              </div>
            )}
            <ConnectionMap
              center={zoom === null ? { label: short, sub: `${refs.length} cross references` } : { label: PARTS[zoom].title, sub: `from ${short}` }}
              branches={branches}
              canBack={zoom !== null || trail.length > 1}
              height={520}
              hint={
                zoom === null
                  ? 'Each line is a part of the Bible, strongest links nearest the center. Click a dot to follow it; click a line to spread that part out by book.'
                  : `The links from ${short} into ${PARTS[zoom].title}, by book. Click a dot to follow it; click the center to step back.`
              }
              dotHint="click to follow it: the Bible and this map move there"
              branchHint="click to spread these out by book"
              onDot={(d) => {
                const s = Number(d.id.split('-')[0])
                if (s !== ordinal) follow(s, [...trail, s])
              }}
              onBranch={(b) => setZoom(PARTS.findIndex((p) => p.id === b.id))}
              onCenter={() => {
                if (zoom !== null) setZoom(null)
                else if (trail.length > 1) follow(trail[trail.length - 2], trail.slice(0, -1))
              }}
            />
          </Section>
          <Section title="Cross references" count={refs.length}>
            <div className="-mx-2 max-w-prose">
              <XrefList refs={refs} canon={canon} bible={bible} first={10} onPick={(s) => goTo(s)} />
            </div>
          </Section>
          <p className="mt-4 text-xs text-muted max-w-prose">Cross references are from OpenBible.info; the bars show how many readers voted for each link. Clicking one in this list reads it without moving the map.</p>
        </>
      )}
    </div>
  )
}
