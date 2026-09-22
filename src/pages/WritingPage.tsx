import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorBlock, LinkedText, Loading, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadWriting } from '@/data/loaders'
import { truncate } from '@/lib/format'
import { formatDay } from '@/store/updates'
import { useSettings } from '@/store/settings'
import { usePageTitle, useSession } from '@/store/session'

const COLOR = 'var(--series-4)'

/** One writing: the question it answers, the text with its references as links, and the passages behind it. */
export default function WritingPage() {
  const { id = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: writing, error } = useData(`writing:${id}`, () => loadWriting(id))
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const setHighlights = useSession((s) => s.setHighlights)
  const goTo = useSession((s) => s.goTo)

  // The passages behind the writing are marked in the Bible while it is open.
  const ranges = useMemo(() => writing?.passages.flatMap((p) => p.ranges) ?? [], [writing])
  useEffect(() => {
    if (!writing) return
    setHighlights([{ ranges, color: COLOR, label: writing.title }])
    return () => setHighlights([])
  }, [writing, ranges, setHighlights])

  usePageTitle(writing?.title, writing ? { description: writing.summary ?? writing.body[0] } : undefined)
  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !writing) return <div className="p-6"><Loading /></div>

  return (
    <article className="p-6 max-w-3xl mx-auto">
      <div className="kicker mb-1">
        <Link to="/writings" className="text-muted hover:text-ink">
          Writings
        </Link>
      </div>
      <h1 className="text-2xl font-semibold leading-tight tracking-tight">{writing.title}</h1>
      <p className="text-sm text-ink-2 mt-1.5">
        By {writing.author}
        {writing.authorNote && <span className="text-muted"> ({writing.authorNote})</span>}
        {writing.askedBy && <>, in answer to a question from {writing.askedBy}</>}
        <span className="text-muted"> · {formatDay(writing.date)}</span>
      </p>

      {writing.question && (
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 max-w-prose">
          <div className="kicker">The question</div>
          <p className="mt-0.5 text-[15px] text-ink">{writing.question}</p>
        </div>
      )}

      <div className="mt-6 space-y-4 max-w-prose font-serif text-[17px] leading-[1.7] text-ink">
        {writing.body.map((p, i) => (
          <p key={i}>
            <LinkedText text={p} canon={canon} />
          </p>
        ))}
      </div>
      {writing.note && <p className="mt-6 text-xs text-muted max-w-prose">{writing.note}</p>}

      {writing.passages.length > 0 && (
        <Section title="The passages behind it" count={writing.passages.length}>
          <ul className="max-w-prose -mx-2">
            {writing.passages.map((p, i) => (
              <li key={i}>
                <button type="button" className="w-full text-left rounded-lg px-2 py-2 hover:bg-surface-2" onClick={() => goTo(p.ranges[0][0])}>
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-sm">{p.label}</span>
                    <span className="text-xs text-muted">{p.ref}</span>
                  </span>
                  {bible && <span className="block text-[13px] text-ink-2 leading-snug mt-0.5 font-serif">{truncate(bible.verses[p.ranges[0][0]] ?? '', 150)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  )
}
