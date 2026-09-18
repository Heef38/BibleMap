import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import { EntityLink, Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadBooks, loadCanon, loadPeopleIndex } from '@/data/loaders'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

export default function BookPage() {
  const { osis = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: books } = useData('books', loadBooks)
  const { data: people } = useData('people-index', loadPeopleIndex)
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const { data: bsb } = useData(bible && !bible.headings ? 'bible:bsb' : null, () => loadBible('bsb'))
  const goTo = useSession((s) => s.goTo)
  const personName = useMemo(() => new Map(people?.map((p) => [p.id, p.title]) ?? []), [people])

  const book = canon?.find(osis)
  const meta = books?.books.find((b) => b.osis === book?.osis)
  const headingsSource = bible?.headings ? bible : bsb
  const outline = useMemo(() => {
    if (!canon || !book || !headingsSource?.headings) return []
    const end = canon.bookEnd(book.n)
    return Object.entries(headingsSource.headings)
      .map(([o, h]) => [Number(o), h] as [number, string])
      .filter(([o]) => o >= book.start && o <= end)
      .sort((a, b) => a[0] - b[0])
  }, [canon, book, headingsSource])

  if (!canon) return <div className="p-6"><Loading /></div>
  if (!book) return <div className="p-6 text-ink-2">No book called “{osis}”.</div>
  const chapters = book.chapters.length

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        kicker={
          <>
            <Link to="/bible" className="text-muted hover:text-accent">
              {book.testament === 'OT' ? 'Old Testament' : 'New Testament'} · {book.division}
            </Link>
          </>
        }
        title={book.name}
        subtitle={
          <>
            {chapters} chapter{chapters === 1 ? '' : 's'} · {book.verseCount.toLocaleString()} verses · {((100 * book.verseCount) / canon.total).toFixed(1)}% of the Bible
            {meta && meta.peopleCount > 0 && <span> · {meta.peopleCount} people and {meta.placeCount} places named</span>}
          </>
        }
      />
      <CanonStrip canon={canon} ranges={[[book.start, canon.bookEnd(book.n)]]} caption="Where this book sits" />
      {meta && meta.writers.length > 0 && (
        <Section title="Traditional writer">
          <div className="flex flex-wrap gap-1.5">
            {meta.writers.map((w) => (
              <EntityLink key={w} type="person" id={w}>
                {personName.get(w) ?? w}
              </EntityLink>
            ))}
          </div>
        </Section>
      )}
      <Section title="Chapters">
        <div className="flex flex-wrap gap-1.5">
          {book.chapters.map((_, i) => (
            <button key={i} type="button" className="chip chip-link" onClick={() => goTo(canon.chapterStart(book.n, i + 1), { focus: false })}>
              {i + 1}
            </button>
          ))}
        </div>
      </Section>
      {outline.length > 0 && (
        <Section title="Outline" count={outline.length}>
          <p className="text-xs text-muted mb-2">Section headings from the {headingsSource?.abbrev}. Click one to read from there.</p>
          <ol className="columns-1 md:columns-2 gap-8 text-sm">
            {outline.map(([o, h]) => {
              const loc = canon.locate(o)
              return (
                <li key={o} className="break-inside-avoid">
                  <button type="button" className="w-full text-left flex gap-2 items-baseline rounded px-1 py-0.5 -mx-1 hover:bg-surface-2" onClick={() => goTo(o)}>
                    <span className="w-12 shrink-0 text-xs text-muted tabular-nums">
                      {chapters > 1 ? `${loc.c}:${loc.v}` : loc.v}
                    </span>
                    <span>{h}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Section>
      )}
    </div>
  )
}
