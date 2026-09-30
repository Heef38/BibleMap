import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import { EntityLink, Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadBooks, loadCanon, loadEntities, loadPeopleIndex, loadPlacesIndex, loadStudiesIndex, loadXrefs } from '@/data/loaders'
import { studiesTouching } from '@/lib/connections'
import { useSettings } from '@/store/settings'
import { usePageTitle, useSession } from '@/store/session'
import { nth } from './config'

/** One surah: what it is called, when it came, what it is about, how it is built, and who is in it. */
export default function SurahPage() {
  const { osis = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: books } = useData('books', loadBooks)
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const book = canon?.find(osis)
  const key = book?.osis ?? null
  const { data: ents } = useData(key ? `entities:${key}` : null, () => loadEntities(key!))
  const { data: xrefs } = useData(key ? `xrefs:${key}` : null, () => loadXrefs(key!))
  const { data: people } = useData('people-index', loadPeopleIndex)
  const { data: places } = useData('places-index', loadPlacesIndex)
  const { data: studyIndex } = useData('studies-index', loadStudiesIndex)
  const goTo = useSession((s) => s.goTo)

  const info = books?.books.find((b) => b.n === book?.n)?.surah
  const start = book?.start ?? 0
  const end = book ? book.start + book.verseCount - 1 : -1

  const outline = useMemo(() => {
    if (!bible?.headings || end < 0) return []
    const out: [number, string][] = []
    for (let o = start; o <= end; o++) if (bible.headings[o]) out.push([o, bible.headings[o]])
    return out
  }, [bible, start, end])

  const named = useMemo(() => {
    const p = new Map<string, number>()
    const l = new Map<string, number>()
    for (const [pIds, lIds] of Object.values(ents ?? {})) {
      for (const id of pIds) p.set(id, (p.get(id) ?? 0) + 1)
      for (const id of lIds) l.set(id, (l.get(id) ?? 0) + 1)
    }
    const sorted = (m: Map<string, number>) => [...m].sort((x, y) => y[1] - x[1])
    return { people: sorted(p), places: sorted(l) }
  }, [ents])
  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])
  const placeName = useMemo(() => new Map(places?.map((p) => [p.id, p.name]) ?? []), [places])

  // The surahs this one shares the most wording with, by how many of its verses link there.
  const kin = useMemo(() => {
    if (!canon || !xrefs || !book) return []
    const n = new Map<number, number>()
    for (const list of Object.values(xrefs)) for (const [s] of list) n.set(canon.locate(s).b, (n.get(canon.locate(s).b) ?? 0) + 1)
    n.delete(book.n)
    return [...n].sort((x, y) => y[1] - x[1]).slice(0, 10)
  }, [canon, xrefs, book])
  const studies = useMemo(() => (studyIndex && end >= 0 ? studiesTouching(studyIndex, start, end) : []), [studyIndex, start, end])

  usePageTitle(book ? `${book.n}. ${book.name}` : undefined, book && info ? { description: `Surah ${book.n}, ${book.name} (${info.meaning}): ${info.summary ?? `${book.verseCount} verses, revealed at ${info.place === 'Meccan' ? 'Mecca' : 'Medina'}.`}` } : undefined)
  if (!canon || !books) return <div className="p-6"><Loading /></div>
  if (!book || !info) return <div className="p-6 text-ink-2">No surah called “{osis}”.</div>

  const share = (100 * book.verseCount) / canon.total
  return (
    <div className="p-6 @container">
      <PageHeader
        kicker={
          <Link to="/quran" className="text-muted hover:text-accent">
            Surah {book.n} · {info.place} · {book.division}
          </Link>
        }
        title={
          <>
            {book.name}{' '}
            <span lang="ar" dir="rtl" className="font-normal text-ink-2 text-xl ml-1">
              {info.arabic}
            </span>
          </>
        }
        subtitle={
          <>
            “{info.meaning}” · {book.verseCount.toLocaleString()} verses · {share < 0.1 ? share.toFixed(2) : share.toFixed(1)}% of the Quran
          </>
        }
        right={
          <button type="button" className="btn btn-primary" onClick={() => goTo(book.start, { focus: false })}>
            Read it
          </button>
        }
      />
      {info.summary && <p className="text-[15px] leading-relaxed max-w-prose -mt-1 mb-4">{info.summary}</p>}

      <dl className="grid gap-x-6 gap-y-2 text-sm mb-5 @xl:grid-cols-2 max-w-3xl">
        <div className="flex gap-2">
          <dt className="text-ink-2 w-32 shrink-0">Revealed</dt>
          <dd>
            at {info.place === 'Meccan' ? 'Mecca' : 'Medina'}, {nth(info.order)} of 114 in the traditional order
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-2 w-32 shrink-0">Nöldeke</dt>
          <dd>
            {info.period} period, {nth(info.noldeke)} in his order
          </dd>
        </div>
        {info.letters && (
          <div className="flex gap-2">
            <dt className="text-ink-2 w-32 shrink-0">Opens with</dt>
            <dd>the letters {info.letters}</dd>
          </div>
        )}
        {info.sajda && (
          <div className="flex gap-2">
            <dt className="text-ink-2 w-32 shrink-0">Prostration</dt>
            <dd className="flex flex-wrap items-center gap-1.5">
              at{' '}
              {info.sajda.map((v) => (
                <button key={v} type="button" className="chip chip-link" onClick={() => goTo(book.start + v - 1)}>
                  verse {v}
                </button>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <CanonStrip canon={canon} ranges={[[start, end]]} caption="Where this surah sits" />

      {outline.length > 0 && (
        <Section title="Outline" count={outline.length}>
          <ol className="columns-1 @2xl:columns-2 gap-8 text-sm">
            {outline.map(([o, h]) => (
              <li key={o} className="break-inside-avoid">
                <button type="button" className="w-full text-left flex gap-2 items-baseline rounded px-1 py-0.5 -mx-1 hover:bg-surface-2" onClick={() => goTo(o)}>
                  <span className="w-9 shrink-0 text-xs text-muted tabular-nums">{o - start + 1}</span>
                  <span>{h}</span>
                </button>
              </li>
            ))}
          </ol>
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

      {kin.length > 0 && (
        <Section title="The surahs closest to it in wording">
          <div className="flex flex-wrap gap-1.5">
            {kin.map(([b, n]) => (
              <Link key={b} to={`/book/${b}`} className="chip chip-link">
                {b}. {canon.book(b).name} <span className="text-muted">{n}</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted mt-1.5">Counted from the related verses: how many links lead from this surah to each. Open “This surah” to see them as a map.</p>
        </Section>
      )}
    </div>
  )
}
