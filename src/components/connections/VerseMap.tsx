import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import ConnectionMap, { type MapBranch } from '@/components/viz/ConnectionMap'
import { Popover, type PopoverState } from '@/components/common/Popover'
import { Loading, RefLink, Section } from '@/components/common/ui'
import { VerseEntities, XrefList } from '@/components/reader/VerseConnections'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadStudiesIndex, loadXrefs } from '@/data/loaders'
import type { Bible } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { PARTS, partColor, partOf, studiesTouching } from '@/lib/connections'
import { truncate } from '@/lib/format'
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

function VerseMapBody({ ordinal, canon, bible }: { ordinal: number; canon: Canon; bible: Bible }) {
  const book = canon.book(canon.locate(ordinal).b)
  const { data: xrefs } = useData(`xrefs:${book.osis}`, () => loadXrefs(book.osis))
  const { data: studyIndex } = useData('studies-index', loadStudiesIndex)
  const goTo = useSession((s) => s.goTo)
  const centerMap = useSession((s) => s.centerMap)
  const [popover, setPopover] = useState<PopoverState | null>(null)

  const refs = useMemo(() => xrefs?.[ordinal] ?? [], [xrefs, ordinal])
  const studies = useMemo(() => (studyIndex ? studiesTouching(studyIndex, ordinal, ordinal) : []), [studyIndex, ordinal])

  const { branches, byPart } = useMemo(() => {
    const byPart = PARTS.map(() => [] as [number, number, number][])
    for (const r of refs) byPart[partOf(canon, r[0])].push(r)
    const max = Math.max(1, refs[0]?.[2] ?? 1)
    const branches: MapBranch[] = PARTS.map((p, i) => ({
      id: p.id,
      title: p.title,
      color: partColor(i),
      // strongest nearest the center
      dots: byPart[i].slice(0, PER_BRANCH).map(([s, e, votes]) => ({
        id: `${s}-${e}`,
        label: canon.rangeLabel(s, e, 'short'),
        color: partColor(i),
        r: 3 + 5 * Math.sqrt(Math.max(votes, 0) / max),
        solid: votes >= max / 3,
        snippet: bible.verses[s],
      })),
    })).filter((b) => b.dots.length)
    return { branches, byPart }
  }, [refs, canon, bible])

  const label = canon.label(ordinal)

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
            <ConnectionMap
              center={{ label: canon.label(ordinal, 'short') }}
              branches={branches}
              canBack={false}
              height={520}
              hint="Each line is a part of the Bible; the strongest links sit nearest the center. Click a dot to read it."
              dotHint="click to read it, or center the map on it"
              onDot={(d, _b, at) => {
                const [s, e] = d.id.split('-').map(Number)
                setPopover({
                  x: at.x,
                  y: at.y,
                  title: canon.rangeLabel(s, e),
                  body: <span className="font-serif">{truncate(bible.verses.slice(s, Math.min(e, s + 3) + 1).join(' '), 260)}</span>,
                  action: {
                    label: 'Read it',
                    run: () => {
                      setPopover(null)
                      goTo(s)
                    },
                  },
                  extra: {
                    label: 'Center the map here',
                    run: () => {
                      setPopover(null)
                      centerMap(s)
                    },
                  },
                })
              }}
              onBranch={(b, at) => {
                const all = byPart[PARTS.findIndex((p) => p.id === b.id)] ?? []
                setPopover({
                  x: at.x,
                  y: at.y,
                  title: `${b.title}: ${all.length} cross reference${all.length === 1 ? '' : 's'}`,
                  body: (
                    <span className="flex flex-wrap gap-1 mt-1">
                      {all.slice(0, 16).map(([s, e], i) => (
                        <RefLink key={i} range={[s, e]} canon={canon} />
                      ))}
                      {all.length > 16 && <span className="text-xs text-muted self-center">and {all.length - 16} more below</span>}
                    </span>
                  ),
                })
              }}
              onCenter={() => goTo(ordinal)}
            />
          </Section>
          <Section title="Cross references" count={refs.length}>
            <div className="-mx-2 max-w-prose">
              <XrefList refs={refs} canon={canon} bible={bible} first={10} onPick={(s) => goTo(s)} />
            </div>
          </Section>
          <p className="mt-4 text-xs text-muted max-w-prose">Cross references are from OpenBible.info; the bars show how many readers voted for each link.</p>
        </>
      )}
      <Popover state={popover} onClose={() => setPopover(null)} />
    </div>
  )
}
