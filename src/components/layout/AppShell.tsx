import { useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import Header from './Header'
import SearchPane from '@/components/search/SearchPane'
import ReaderPane from '@/components/reader/ReaderPane'
import { IconBook, IconChevronLeft, IconChevronRight, IconMap, IconSearch } from '@/components/common/icons'
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

/** [ and ] toggle the panes, / jumps to the search box. */
function useShortcuts() {
  const set = useSettings((s) => s.set)
  const focusSearch = useSession((s) => s.focusSearch)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === '[') set({ showLeft: !useSettings.getState().showLeft })
      else if (e.key === ']') set({ showRight: !useSettings.getState().showRight })
      else if (e.key === '/') {
        e.preventDefault()
        set({ showLeft: true })
        focusSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set, focusSearch])
}

function PaneHandle({ side, open, onClick }: { side: 'left' | 'right'; open: boolean; onClick: () => void }) {
  const label = side === 'left' ? (open ? 'Hide the search pane' : 'Show the search pane') : open ? 'Hide the reading pane' : 'Show the reading pane'
  const pointsLeft = side === 'left' ? open : !open
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} ( ${side === 'left' ? '[' : ']'} )`}
      aria-label={label}
      className={`pointer-events-auto absolute top-0 ${side === 'left' ? 'left-0 rounded-r-md border-l-0' : 'right-0 rounded-l-md border-r-0'} h-7 w-5 flex items-center justify-center border border-line bg-surface text-muted hover:text-ink hover:bg-surface-2`}
    >
      {pointsLeft ? <IconChevronLeft width={14} height={14} /> : <IconChevronRight width={14} height={14} />}
    </button>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const showLeft = useSettings((s) => s.showLeft)
  const showRight = useSettings((s) => s.showRight)
  const set = useSettings((s) => s.set)
  const mobile = useMediaQuery('(max-width: 900px)')
  const pane = useSession((s) => s.mobilePane)
  const setPane = useSession((s) => s.setMobilePane)
  useReaderUrlSync()
  useShortcuts()

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
        <main className="min-w-0 min-h-0 overflow-y-auto relative">
          <div className="sticky top-3 z-10 h-0 pointer-events-none">
            <PaneHandle side="left" open={showLeft} onClick={() => set({ showLeft: !showLeft })} />
            <PaneHandle side="right" open={showRight} onClick={() => set({ showRight: !showRight })} />
          </div>
          {children}
        </main>
        {showRight && (
          <aside className="pane border-l border-line min-h-0 flex flex-col">
            <ReaderPane />
          </aside>
        )}
      </div>
    </div>
  )
}
