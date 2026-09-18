import { useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import Header from './Header'
import SearchPane from '@/components/search/SearchPane'
import ReaderPane from '@/components/reader/ReaderPane'
import { IconBook, IconMap, IconSearch } from '@/components/common/icons'
import { useSettings } from '@/store/settings'
import { useSession, type MobilePane } from '@/store/session'
import { useData } from '@/data/useData'
import { loadCanon } from '@/data/loaders'
import { parseRefs } from '@/lib/refs'
import { useMediaQuery } from '@/lib/hooks'

/** Keep the reader's position in the URL (?p=John.3.16) so any view is a shareable link. */
function useReaderUrlSync() {
  const { data: canon } = useData('canon', loadCanon)
  const [params, setParams] = useSearchParams()
  const readerOrdinal = useSession((s) => s.readerOrdinal)
  const focus = useSession((s) => s.focus)
  const goTo = useSession((s) => s.goTo)
  const applied = useRef(false)
  const touched = useRef(false)

  useEffect(() => {
    if (!canon || applied.current) return
    applied.current = true
    const p = params.get('p')
    if (!p) return
    const parsed = parseRefs(p, canon)
    if (parsed.ranges.length) {
      touched.current = true
      goTo(parsed.ranges[0][0], { focus: /\.\d+\.\d+$/.test(p), pane: false })
    }
  }, [canon, params, goTo])

  useEffect(() => {
    if (!canon || !applied.current) return
    if (!touched.current) {
      if (readerOrdinal === 0 && focus === null) return
      touched.current = true
    }
    const o = focus ?? readerOrdinal
    const osis = focus !== null ? canon.osis(o) : canon.osis(o).replace(/\.\d+$/, '')
    if (params.get('p') === osis) return
    const next = new URLSearchParams(params)
    next.set('p', osis)
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canon, readerOrdinal, focus])
}

const TABS: { id: MobilePane; label: string; icon: typeof IconMap }[] = [
  { id: 'explore', label: 'Explore', icon: IconSearch },
  { id: 'map', label: 'Map', icon: IconMap },
  { id: 'read', label: 'Read', icon: IconBook },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const showLeft = useSettings((s) => s.showLeft)
  const showRight = useSettings((s) => s.showRight)
  const mobile = useMediaQuery('(max-width: 900px)')
  const pane = useSession((s) => s.mobilePane)
  const setPane = useSession((s) => s.setMobilePane)
  useReaderUrlSync()

  if (mobile) {
    return (
      <div className="h-full flex flex-col">
        <Header />
        <div className="flex-1 min-h-0 relative">
          <aside className={`pane absolute inset-0 overflow-y-auto ${pane === 'explore' ? '' : 'hidden'}`}>
            <SearchPane />
          </aside>
          <main className={`absolute inset-0 overflow-y-auto ${pane === 'map' ? '' : 'hidden'}`}>{children}</main>
          <aside className={`pane absolute inset-0 flex flex-col ${pane === 'read' ? '' : 'hidden'}`}>
            <ReaderPane />
          </aside>
        </div>
        <nav className="flex border-t border-line bg-surface shrink-0" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${pane === t.id ? 'text-accent font-medium' : 'text-ink-2'}`}
              aria-pressed={pane === t.id}
              onClick={() => setPane(t.id)}
            >
              <t.icon width={18} height={18} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    )
  }

  const cols = [showLeft ? '300px' : null, 'minmax(0, 1fr)', showRight ? 'minmax(360px, 32%)' : null].filter(Boolean).join(' ')
  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: cols }}>
        {showLeft && (
          <aside className="pane border-r border-line overflow-y-auto min-h-0">
            <SearchPane />
          </aside>
        )}
        <main className="min-w-0 min-h-0 overflow-y-auto">{children}</main>
        {showRight && (
          <aside className="pane border-l border-line min-h-0 flex flex-col">
            <ReaderPane />
          </aside>
        )}
      </div>
    </div>
  )
}
