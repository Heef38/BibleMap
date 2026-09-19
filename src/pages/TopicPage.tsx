import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import { ErrorBlock, Loading, PageHeader, RefLink, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon, loadTopic } from '@/data/loaders'
import { countVerses, mergeRanges } from '@/lib/refs'
import { useSession } from '@/store/session'

const COLOR = 'var(--series-7)'

export default function TopicPage() {
  const { id = '' } = useParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: topic, error } = useData(`topic:${id}`, () => loadTopic(id))
  const setHighlights = useSession((s) => s.setHighlights)
  const ranges = useMemo(() => (topic ? mergeRanges(topic.entries.flatMap((e) => e.refs)) : []), [topic])
  useEffect(() => {
    if (!topic) return
    setHighlights([{ ranges, color: COLOR, label: topic.title }])
    return () => setHighlights([])
  }, [topic, ranges, setHighlights])

  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !topic) return <div className="p-6"><Loading /></div>

  const source = topic.source === 'nave' ? "Nave's Topical Bible (1896)" : "Torrey's New Topical Textbook (1897)"
  return (
    <div className="p-6">
      <PageHeader
        kicker={`Topic · ${source}`}
        title={topic.title}
        subtitle={
          <>
            {topic.entries.length} entries · {countVerses(ranges).toLocaleString()} verses
            {topic.seeAlso.length > 0 && (
              <>
                {' '}
                · see also{' '}
                {topic.seeAlso.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ', '}
                    <Link to={`/search?q=${encodeURIComponent(s)}`}>{s}</Link>
                  </span>
                ))}
              </>
            )}
          </>
        }
      />
      <CanonStrip canon={canon} ranges={ranges} color={COLOR} caption={`Where “${topic.title}” is treated`} />
      <Section title="Entries" count={topic.entries.length}>
        <ol className="space-y-3">
          {topic.entries.map((e, i) => (
            <li key={i} className="text-sm">
              <div className="text-ink-2 leading-snug">{stripRefs(e.text)}</div>
              {e.refs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {e.refs.map((r, j) => (
                    <RefLink key={j} range={r} canon={canon} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}

/** The raw entry text ends with its reference list; keep only the descriptive part when there is one. */
function stripRefs(text: string): string {
  const m = /^(.*?)(?:\s+[1-3]?\s?[A-Z][a-z]+\.? \d+[:.\d,\s;–-]*)+$/.exec(text)
  const head = m?.[1]?.trim()
  return head && head.length >= 3 ? head : text
}
