import { useParams } from 'react-router'
import { Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon } from '@/data/loaders'
import { useSession } from '@/store/session'

export default function BookPage() {
  const { osis = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const goTo = useSession((s) => s.goTo)
  if (!canon) return <div className="p-6"><Loading /></div>
  const book = canon.find(osis)
  if (!book) return <div className="p-6 text-ink-2">No book called “{osis}”.</div>
  return (
    <div className="p-6 max-w-4xl">
      <PageHeader kicker={`${book.testament === 'OT' ? 'Old Testament' : 'New Testament'} · ${book.division}`} title={book.name} subtitle={`${book.chapters.length} chapter${book.chapters.length === 1 ? '' : 's'} · ${book.verseCount.toLocaleString()} verses`} />
      <Section title="Chapters">
        <div className="flex flex-wrap gap-1.5">
          {book.chapters.map((_, i) => (
            <button key={i} type="button" className="chip chip-link" onClick={() => goTo(canon.chapterStart(book.n, i + 1), { focus: false })}>
              {i + 1}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}
