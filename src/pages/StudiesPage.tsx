import { useMemo } from 'react'
import { Link } from 'react-router'
import { Loading, PageHeader, Section } from '@/components/common/ui'
import { NewTag } from '@/components/common/Updates'
import { useData } from '@/data/useData'
import { loadCanon, loadStudiesIndex } from '@/data/loaders'
import type { StudyIndexEntry } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { OTHER_SHELF, SHELVES } from '@/config/studies'
import { isNewStudy } from '@/store/updates'
import { usePageTitle } from '@/store/session'

/** Every study, on shelves by what it is about. */
export default function StudiesPage() {
  usePageTitle('Studies', { description: 'Guided Bible studies drawn as connection maps, arcs and timelines: the Trinity, the resurrection, the book of Isaiah, the parables, the promises of God, Christ in the Old Testament and more.' })
  const { data: canon } = useData('canon', loadCanon)
  const { data: studies } = useData('studies-index', loadStudiesIndex)

  const shelves = useMemo(() => {
    if (!studies) return []
    const byId = new Map(studies.map((s) => [s.id, s]))
    const filed = new Set(SHELVES.flatMap((s) => s.ids))
    const newFirst = (list: StudyIndexEntry[]) => [...list].sort((a, b) => Number(isNewStudy(b.added)) - Number(isNewStudy(a.added)))
    const out = SHELVES.map((s) => ({ ...s, studies: newFirst(s.ids.flatMap((id) => byId.get(id) ?? [])) }))
    const rest = studies.filter((s) => !filed.has(s.id))
    if (rest.length) out.push({ ...OTHER_SHELF, ids: [], studies: newFirst(rest) })
    return out.filter((s) => s.studies.length)
  }, [studies])

  return (
    <div className="p-6 @container">
      <PageHeader
        kicker="Bible-Map"
        title="Studies"
        subtitle="Each study gathers the passages on one theme and draws them as maps, arcs and timelines. Open one and it sits here beside the Bible; click any passage in it to read it."
      />
      {!studies || !canon ? (
        <Loading />
      ) : (
        shelves.map((shelf) => (
          <Section key={shelf.title} title={shelf.title} count={shelf.studies.length}>
            {shelf.note && <p className="text-sm text-ink-2 -mt-1 mb-3">{shelf.note}</p>}
            <div className="grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-3">
              {shelf.studies.map((s) => (
                <StudyCard key={s.id} study={s} canon={canon} />
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  )
}

function StudyCard({ study: s, canon }: { study: StudyIndexEntry; canon: Canon }) {
  return (
    <Link to={`/study/${s.id}`} className="flex flex-col rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:no-underline text-ink">
      <div className="font-semibold text-base leading-snug">
        {s.title} {isNewStudy(s.added) && <NewTag />}
      </div>
      {s.subtitle && <div className="text-ink-2 text-sm mt-0.5">{s.subtitle}</div>}
      <div className="mt-auto pt-3">
        <MiniStrip canon={canon} ranges={s.ranges ?? []} />
        <div className="text-xs text-muted mt-1.5">
          {s.refCount} references · {s.verseCount.toLocaleString()} verses
        </div>
      </div>
    </Link>
  )
}

/** Where a study's passages fall, from Genesis to Revelation, as ticks on a thin bar. */
function MiniStrip({ canon, ranges }: { canon: Canon; ranges: [number, number][] }) {
  const ntStart = canon.books.find((b) => b.testament === 'NT')?.start ?? canon.total
  const x = (o: number) => (o / canon.total) * 100
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block w-full h-2.5" role="img" aria-label="Where its passages are in the Bible">
      <rect x={0} y={3} width={x(ntStart)} height={4} fill="var(--surface-2)" />
      <rect x={x(ntStart)} y={3} width={100 - x(ntStart)} height={4} fill="color-mix(in oklab, var(--surface-2) 70%, var(--line-strong))" />
      {ranges.map(([a, z], i) => (
        <rect key={i} x={x(a)} y={0} width={Math.max(0.25, x(z + 1) - x(a))} height={10} fill="var(--accent)" opacity={0.75} />
      ))}
    </svg>
  )
}
