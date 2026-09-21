import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Header from './Header'
import RightPane from './RightPane'
import Splitter from './Splitter'
import SearchPane from '@/components/search/SearchPane'
import ReaderPane from '@/components/reader/ReaderPane'
import NotesPanel from '@/components/notes/NotesPanel'
import { IconBook, IconChevronLeft, IconChevronRight, IconMap, IconSearch } from '@/components/common/icons'
import { useSettings } from '@/store/settings'
import { useSession, type MobilePane } from '@/store/session'
import { useData } from '@/data/useData'
import { loadCanon } from '@/data/loaders'
import { parseRefs } from '@/lib/refs'
import { useMediaQuery } from '@/lib/hooks'

/**
 * Keep the reader's position in the URL (?p=John.3.16), and the verse whose map is open (?v=), so any
 * view is a shareable link, and make them part of the browser history: a jump in the reader or a verse
 * picked for its map is a Back step, and Back or Forward put the reader, the map (and, on a phone, the
 * pane) back where that step had them.
 */
function useReaderHistory() {
  const { data: canon } = useData('canon', loadCanon)
  const location = useLocation()
  const navigate = useNavigate()
  const readerOrdinal = useSession((s) => s.readerOrdinal)
  const focus = useSession((s) => s.focus)
  const mapVerse = useSession((s) => s.mapVerse)
  const pane = useSession((s) => s.mobilePane)
  const seen = useRef<string | null>(null)
  const touched = useRef(false)

  useEffect(() => {
    if (!canon) return
    const s = useSession.getState()
    const osisOf = (o: number, f: number | null) => (f !== null ? canon.osis(f) : canon.osis(o).replace(/\.\d+$/, ''))
    const params = new URLSearchParams(location.search)
    const urlP = params.get('p')
    const urlV = params.get('v')
    const saved = (location.state ?? {}) as { pane?: MobilePane }
    const arrived = seen.current !== location.key
    seen.current = location.key

    if (arrived) {
      // A link, Back, Forward, a reload or a shared URL: the entry says where things were.
      // Any store change below runs this again, and then the URL and the store agree.
      let restored = false
      if (saved.pane && saved.pane !== s.mobilePane) {
        s.setMobilePane(saved.pane)
        restored = true
      }
      if (urlP && urlP !== osisOf(s.readerOrdinal, s.focus)) {
        const parsed = parseRefs(urlP, canon)
        if (parsed.ranges.length) {
          touched.current = true
          s.restore(parsed.ranges[0][0], /\.\d+\.\d+$/.test(urlP))
          restored = true
        }
      }
      // The verse map belongs to the entry: open where it has one, gone where it has none (a plain link).
      const v = urlV ? (parseRefs(urlV, canon).ranges[0]?.[0] ?? null) : null
      if (v !== s.mapVerse) {
        s.restoreMap(v)
        restored = true
      }
      if (restored) return
    }

    const readerP = osisOf(s.readerOrdinal, s.focus)
    if (readerP !== osisOf(0, null)) touched.current = true
    // Until the reader has moved, leave ?p off so plain links stay plain.
    const wantP = touched.current ? readerP : urlP
    const wantV = s.mapVerse !== null ? canon.osis(s.mapVerse) : null
    const nowPane = s.mobilePane
    if (urlP === wantP && urlV === wantV && saved.pane === nowPane) return
    if (wantP && wantP !== urlP) params.set('p', wantP)
    if (wantV) params.set('v', wantV)
    else params.delete('v')
    const changed = urlP !== wantP || urlV !== wantV
    const to = { pathname: location.pathname, search: changed ? `?${params}` : location.search, hash: location.hash }
    if (!arrived && s.history === 'push' && changed) {
      // Record where this entry was before the move, then add the move as a new entry.
      const back = new URLSearchParams(location.search)
      back.set('p', osisOf(s.before.ordinal, s.before.focus))
      if (s.before.mapVerse !== null) back.set('v', canon.osis(s.before.mapVerse))
      else back.delete('v')
      navigate({ pathname: location.pathname, search: `?${back}`, hash: location.hash }, { replace: true, state: { ...saved, pane: s.before.pane } })
      navigate(to, { state: { pane: nowPane } })
    } else {
      navigate(to, { replace: true, state: { ...saved, pane: nowPane } })
    }
  }, [canon, location, readerOrdinal, focus, mapVerse, pane, navigate])
}

// In the order of the desktop panes: search and notes, the Bible, the right pane.
const TABS: { id: MobilePane; label: string; icon: typeof IconMap }[] = [
  { id: 'explore', label: 'Explore', icon: IconSearch },
  { id: 'read', label: 'Read', icon: IconBook },
  { id: 'map', label: 'Map', icon: IconMap },
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
  const label = side === 'left' ? (open ? 'Hide the search pane' : 'Show the search pane') : open ? 'Hide the map pane' : 'Show the map pane'
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

/** The bar between the page and the docked Bible on a phone: drag it, or use the arrow keys. */
function SplitHandle({ box, split, onDrag, onCommit }: { box: RefObject<HTMLDivElement | null>; split: number; onDrag: (v: number | null) => void; onCommit: (v: number) => void }) {
  const clamp = (v: number) => Math.min(0.8, Math.max(0.2, v))
  const at = (clientY: number) => {
    const r = box.current!.getBoundingClientRect()
    return clamp((r.bottom - clientY) / r.height)
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize the Bible"
      aria-valuemin={20}
      aria-valuemax={80}
      aria-valuenow={Math.round(split * 100)}
      tabIndex={0}
      className="h-6 shrink-0 flex items-center justify-center border-t border-line bg-surface cursor-row-resize touch-none select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onDrag(at(e.clientY))
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onDrag(at(e.clientY))
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        onCommit(at(e.clientY))
        onDrag(null)
      }}
      onPointerCancel={() => onDrag(null)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        onCommit(clamp(split + (e.key === 'ArrowUp' ? 0.05 : -0.05)))
      }}
    >
      <span className="w-10 h-1 rounded-full bg-line-strong" aria-hidden />
    </div>
  )
}

/** Search on top, notes below, with a bar between them to share the height. */
function LeftPane() {
  const notesOpen = useSettings((s) => s.notesOpen)
  const notesSplit = useSettings((s) => s.notesSplit)
  const set = useSettings((s) => s.set)
  const [drag, setDrag] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const split = drag ?? notesSplit
  return (
    <div ref={box} className="h-full flex flex-col min-h-0">
      <div className="min-h-0 overflow-y-auto" style={{ flex: notesOpen ? `${1 - split} 1 0` : '1 1 0' }}>
        <SearchPane />
      </div>
      {notesOpen ? (
        <Splitter box={box} dir="row" value={split} min={0.15} max={0.8} label="Resize the notes" onDrag={setDrag} onCommit={(v) => set({ notesSplit: v })} reset={0.36} />
      ) : (
        <div className="border-t border-line" />
      )}
      <div className="min-h-0 flex flex-col" style={notesOpen ? { flex: `${split} 1 0` } : undefined}>
        <NotesPanel />
      </div>
    </div>
  )
}

/** On a phone, the list under a picked verse offers its map: open it on the Map tab. */
function openMapTab(o: number) {
  const s = useSession.getState()
  if (s.mapVerse !== o) s.selectVerse(o)
  s.setMobilePane('map')
}

export default function AppShell({ children }: { children: ReactNode }) {
  const showLeft = useSettings((s) => s.showLeft)
  const showRight = useSettings((s) => s.showRight)
  const bibleSplit = useSettings((s) => s.bibleSplit)
  const set = useSettings((s) => s.set)
  const mobile = useMediaQuery('(max-width: 900px)')
  const pane = useSession((s) => s.mobilePane)
  const setPane = useSession((s) => s.setMobilePane)
  const wide = useSession((s) => s.wide)
  const mobileBible = useSettings((s) => s.mobileBible)
  const mobileSplit = useSettings((s) => s.mobileSplit)
  const [drag, setDrag] = useState<number | null>(null)
  const [colDrag, setColDrag] = useState<number | null>(null)
  const splitBox = useRef<HTMLDivElement>(null)
  const colBox = useRef<HTMLDivElement>(null)
  useReaderHistory()
  useShortcuts()

  if (mobile) {
    // With the Bible docked, the top shows Explore or the page and the Bible stays open below it.
    const top: MobilePane = pane === 'explore' ? 'explore' : 'map'
    const shown = (id: MobilePane) => (mobileBible ? top === id : pane === id)
    const tabs = mobileBible ? TABS.filter((t) => t.id !== 'read') : TABS
    const split = drag ?? mobileSplit
    return (
      <div className="h-full flex flex-col">
        <Header />
        <div ref={splitBox} className="flex-1 min-h-0 flex flex-col">
          <div className="relative min-h-0" style={{ flex: mobileBible ? `${1 - split} 1 0` : '1 1 0' }}>
            <aside className={`pane absolute inset-0 overflow-y-auto ${shown('explore') ? '' : 'hidden'}`}>
              <SearchPane />
              <div className="border-t border-line flex flex-col min-h-[22rem] mt-2">
                <NotesPanel />
              </div>
            </aside>
            <div className={`absolute inset-0 ${shown('map') ? '' : 'hidden'}`}>
              <RightPane mobile>{children}</RightPane>
            </div>
            {!mobileBible && (
              <aside className={`pane absolute inset-0 flex flex-col ${pane === 'read' ? '' : 'hidden'}`}>
                <ReaderPane inlineConnections onMap={openMapTab} />
              </aside>
            )}
          </div>
          {mobileBible && (
            <>
              <SplitHandle box={splitBox} split={split} onDrag={setDrag} onCommit={(v) => set({ mobileSplit: v })} />
              <aside className="pane flex flex-col min-h-0" style={{ flex: `${split} 1 0` }} aria-label="Bible">
                <ReaderPane />
              </aside>
            </>
          )}
        </div>
        <nav className="flex border-t border-line bg-surface shrink-0" aria-label="Sections">
          {tabs.map((t) => {
            const on = shown(t.id)
            return (
              <button
                key={t.id}
                type="button"
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${on ? 'font-medium' : ''}`}
                style={{ color: on ? 'var(--accent)' : 'var(--ink-2)' }}
                aria-pressed={on}
                onClick={() => setPane(t.id)}
              >
                <t.icon width={18} height={18} />
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>
    )
  }

  // Desktop: search and notes | the Bible | the right pane. A widened right pane covers the Bible;
  // with the right pane hidden, the Bible has the room whether or not it was widened.
  const bibleShown = !(wide && showRight)
  const share = colDrag ?? bibleSplit
  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 min-h-0 flex">
        {showLeft && (
          <aside className="pane border-r border-line w-[300px] shrink-0 min-h-0" aria-label="Search and notes">
            <LeftPane />
          </aside>
        )}
        <div ref={colBox} className="flex-1 min-w-0 min-h-0 flex">
          {bibleShown && (
            <section className="pane min-w-[280px] min-h-0 flex flex-col" style={{ flex: showRight ? `${share} 1 0` : '1 1 0' }} aria-label="Bible">
              <ReaderPane
                inlineConnections={!showRight}
                edge={
                  <>
                    <PaneHandle side="left" open={showLeft} onClick={() => set({ showLeft: !showLeft })} />
                    <PaneHandle side="right" open={showRight} onClick={() => set({ showRight: !showRight })} />
                  </>
                }
              />
            </section>
          )}
          {bibleShown && showRight && (
            <Splitter box={colBox} dir="col" value={share} min={0.25} max={0.75} label="Resize the Bible and the map pane" onDrag={setColDrag} onCommit={(v) => set({ bibleSplit: v })} reset={0.46} />
          )}
          {showRight && (
            <section className="min-w-[300px] min-h-0" style={{ flex: bibleShown ? `${1 - share} 1 0` : '1 1 0' }} aria-label="Studies and maps">
              <RightPane mobile={false}>{children}</RightPane>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
