import { useEffect, useState } from 'react'
import { UpcomingList, UpdateList } from '@/components/common/Updates'
import { UPDATES } from '@/config/updates'
import { isUnseen, useUnseen, useUpdates } from '@/store/updates'
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router'
import { IconArrowLeft, IconArrowRight, IconBook, IconHeart, IconInfo, IconMessage, IconSparkle, IconMoon, IconPanelLeft, IconPanelRight, IconSearch, IconSettings, IconSun } from '@/components/common/icons'
import BrandLogo from '@/components/common/BrandLogo'
import { SITE } from '@/config/site'
import { useSession } from '@/store/session'
import { useSettings, type FontSize, type Theme } from '@/store/settings'
import { useData } from '@/data/useData'
import { loadBibleIndex } from '@/data/loaders'
import { useMediaQuery } from '@/lib/hooks'

function ThemeButton() {
  const theme = useSettings((s) => s.theme)
  const set = useSettings((s) => s.set)
  const osDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme === 'system' && osDark)
  return (
    <button type="button" className="btn btn-ghost max-[480px]:hidden" onClick={() => set({ theme: dark ? 'light' : 'dark' })} title={dark ? 'Switch to light' : 'Switch to dark'}>
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const { data: bibles } = useData('bibles', loadBibleIndex)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const themes: [Theme, string][] = [
    ['system', 'System'],
    ['light', 'Light'],
    ['dark', 'Dark'],
  ]
  const sizes: [FontSize, string][] = [
    ['sm', 'S'],
    ['md', 'M'],
    ['lg', 'L'],
    ['xl', 'XL'],
  ]
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl border border-line bg-surface p-4 text-sm" style={{ boxShadow: 'var(--shadow)' }} role="dialog" aria-label="Settings">
        <div className="kicker mb-3">Settings</div>
        <label className="block mb-3">
          <span className="block text-ink-2 mb-1">Translation</span>
          <select className="field" value={s.translation} onChange={(e) => s.set({ translation: e.target.value })}>
            {(bibles ?? [{ id: s.translation, name: s.translation.toUpperCase(), abbrev: s.translation.toUpperCase(), redLetter: false, headings: false }]).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.abbrev})
              </option>
            ))}
          </select>
        </label>
        <div className="mb-3">
          <span className="block text-ink-2 mb-1">Theme</span>
          <div className="seg" role="group" aria-label="Theme">
            {themes.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={s.theme === id} onClick={() => s.set({ theme: id })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <span className="block text-ink-2 mb-1">Scripture text size</span>
          <div className="seg" role="group" aria-label="Text size">
            {sizes.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={s.fontSize === id} onClick={() => s.set({ fontSize: id })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={s.redLetter} onChange={(e) => s.set({ redLetter: e.target.checked })} />
          Show the words of Jesus in red
        </label>
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={s.showHeadings} onChange={(e) => s.set({ showHeadings: e.target.checked })} />
          Section headings
        </label>
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={s.showNumbers} onChange={(e) => s.set({ showNumbers: e.target.checked })} />
          Verse numbers
        </label>
        <div className="mt-3 pt-3 border-t border-line text-xs text-ink-2">
          <Link to="/about" onClick={onClose}>
            About
          </Link>
          {' · '}
          <Link to="/feedback" onClick={onClose}>
            Feedback
          </Link>
          {' · '}
          <Link to="/credits" onClick={onClose}>
            Data sources and licenses
          </Link>
        </div>
      </div>
    </>
  )
}

/** What's new: a dot while there are updates this browser has not opened, and the list of them. */
function WhatsNew() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'new' | 'soon'>('new')
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())
  const unseen = useUnseen()
  const markSeen = useUpdates((s) => s.markSeen)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const toggle = () => {
    if (!open) {
      // Keep the New markers on screen while the panel is open, then count them as seen.
      const seen = useUpdates.getState().seen
      setFresh(new Set(UPDATES.filter((u) => isUnseen(u, seen)).map((u) => u.id)))
      markSeen()
    }
    setOpen(!open)
  }
  const label = unseen.length ? `What's new (${unseen.length} new)` : "What's new"
  return (
    <div className="relative">
      <button type="button" className="btn btn-ghost relative" style={{ color: 'var(--accent)' }} aria-expanded={open} aria-haspopup="dialog" onClick={toggle} title={label} aria-label={label}>
        <IconSparkle />
        <span className="max-[900px]:hidden">What's new</span>
        {unseen.length > 0 && <span className="absolute top-1 left-[22px] w-2 h-2 rounded-full bg-accent ring-2 ring-[var(--surface)]" aria-hidden />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-full mt-1 z-40 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-4 text-sm max-[480px]:fixed max-[480px]:left-2 max-[480px]:right-2 max-[480px]:top-12 max-[480px]:w-auto"
            style={{ boxShadow: 'var(--shadow)' }}
            role="dialog"
            aria-label="What's new"
          >
            <div className="seg mb-3 text-[13px]" role="group" aria-label="Show">
              <button type="button" aria-pressed={tab === 'new'} onClick={() => setTab('new')}>
                What's new
              </button>
              <button type="button" aria-pressed={tab === 'soon'} onClick={() => setTab('soon')}>
                Coming soon
              </button>
            </div>
            {tab === 'new' ? <UpdateList items={UPDATES} fresh={fresh} onNavigate={() => setOpen(false)} /> : <UpcomingList />}
            <div className="mt-3 pt-3 border-t border-line text-xs text-ink-2">
              {tab === 'soon' ? 'What would you use most?' : 'Have an idea?'}{' '}
              <Link to="/feedback" onClick={() => setOpen(false)}>
                Share it on the feedback board
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Back and Forward through this visit, reader jumps included, as a bar under the header: its left
 * half goes back, its right half forward. Back stops at the first page of the visit instead of
 * leaving the site; Forward is on when a Back step can be undone.
 */
export function HistoryBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const [pos, setPos] = useState({ idx: 0, max: 0 })
  useEffect(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    let max = idx
    try {
      max = Math.max(idx, Number(sessionStorage.getItem('biblemap.historyMax')) || 0)
    } catch {
      /* no storage: Forward only knows this page load */
    }
    if (navType === 'PUSH') max = idx
    try {
      sessionStorage.setItem('biblemap.historyMax', String(max))
    } catch {
      /* fine */
    }
    setPos({ idx, max })
  }, [location.key, navType])
  return (
    <nav className="history-bar flex h-7 shrink-0 border-b border-line bg-surface text-xs text-ink-2" aria-label="History">
      <button type="button" className="history-half flex-1 flex items-center gap-1.5 pl-3" disabled={pos.idx <= 0} onClick={() => navigate(-1)} title="Back (Alt+←)">
        <IconArrowLeft width={14} height={14} />
        Back
      </button>
      <button type="button" className="history-half flex-1 flex items-center justify-end gap-1.5 pr-3" disabled={pos.idx >= pos.max} onClick={() => navigate(1)} title="Forward (Alt+→)">
        Forward
        <IconArrowRight width={14} height={14} />
      </button>
    </nav>
  )
}

export default function Header() {
  const showLeft = useSettings((s) => s.showLeft)
  const showRight = useSettings((s) => s.showRight)
  const mobileBible = useSettings((s) => s.mobileBible)
  const set = useSettings((s) => s.set)
  const focusSearch = useSession((s) => s.focusSearch)
  const [open, setOpen] = useState(false)
  return (
    <header className="h-12 shrink-0 flex items-center gap-3 max-[480px]:gap-1.5 px-3 max-[480px]:px-2 border-b border-line bg-surface relative z-20">
      <Link to="/" className="flex items-center shrink-0 hover:no-underline" title="BibleMap home">
        {/* The book alone on a phone, the full name where there is room. */}
        <BrandLogo variant="wide" className="h-6 max-[480px]:hidden" />
        <BrandLogo variant="mark" className="h-7 min-[481px]:hidden" />
      </Link>
      <span className="text-muted text-xs max-[900px]:hidden">see how the story connects</span>
      <nav className="ml-auto flex items-center gap-1" aria-label="Site">
        <NavLink to="/about" className={({ isActive }) => `btn btn-ghost hover:no-underline ${isActive ? 'active' : ''}`} title="About BibleMap">
          <IconInfo />
          <span className="max-[900px]:hidden">About</span>
        </NavLink>
        <NavLink to="/feedback" className={({ isActive }) => `btn btn-ghost hover:no-underline ${isActive ? 'active' : ''}`} title="Ideas and feedback">
          <IconMessage />
          <span className="max-[900px]:hidden">Feedback</span>
        </NavLink>
        <WhatsNew />
        {SITE.donateUrl && (
          <a href={SITE.donateUrl} target="_blank" rel="noopener noreferrer" className="btn hover:no-underline" style={{ color: 'var(--ink)' }} title="Support BibleMap">
            <IconHeart className="text-wj" />
            <span className="max-[480px]:hidden">Donate</span>
          </a>
        )}
      </nav>
      <span className="w-px h-5 bg-line" aria-hidden />
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn btn-ghost min-[901px]:hidden"
          aria-pressed={mobileBible}
          onClick={() => set({ mobileBible: !mobileBible })}
          title={mobileBible ? 'Hide the Bible' : 'Show the Bible under the page'}
          aria-label={mobileBible ? 'Hide the Bible' : 'Show the Bible under the page'}
        >
          <IconBook />
        </button>
        {!showLeft && (
          <button
            type="button"
            className="btn btn-ghost max-[900px]:hidden"
            onClick={() => {
              set({ showLeft: true })
              focusSearch()
            }}
            title="Search ( / )"
          >
            <IconSearch />
          </button>
        )}
        <button type="button" className="btn btn-ghost max-[900px]:hidden" aria-pressed={showLeft} onClick={() => set({ showLeft: !showLeft })} title={showLeft ? 'Hide the search pane ( [ )' : 'Show the search pane ( [ )'}>
          <IconPanelLeft />
        </button>
        <button type="button" className="btn btn-ghost max-[900px]:hidden" aria-pressed={showRight} onClick={() => set({ showRight: !showRight })} title={showRight ? 'Hide the map pane ( ] )' : 'Show the map pane ( ] )'}>
          <IconPanelRight />
        </button>
        <ThemeButton />
        <div className="relative">
          <button type="button" className="btn btn-ghost" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} title="Settings">
            <IconSettings />
          </button>
          {open && <SettingsPanel onClose={() => setOpen(false)} />}
        </div>
      </div>
    </header>
  )
}
