import { Link } from 'react-router'
import { Loading, PageHeader } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadWritingsIndex } from '@/data/loaders'
import { formatDay } from '@/store/updates'
import { usePageTitle } from '@/store/session'
import { EDITION } from '@edition/config'
import { SITE } from '@edition/site'

/** Every writing, newest first. */
export default function WritingsPage() {
  usePageTitle('Writings', { description: EDITION.text.writingsDescription })
  const { data: writings } = useData('writings-index', loadWritingsIndex)
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader kicker={SITE.name} title="Writings" subtitle={EDITION.text.writingsIntro} />
      {!writings ? (
        <Loading />
      ) : (
        <div className="grid gap-3">
          {writings.map((w) => (
            <Link key={w.id} to={`/writing/${w.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:no-underline text-ink">
              <div className="font-semibold text-base leading-snug">{w.title}</div>
              {w.summary && <div className="text-ink-2 text-sm mt-1">{w.summary}</div>}
              <div className="text-xs text-muted mt-2">
                By {w.author} · {formatDay(w.date)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
