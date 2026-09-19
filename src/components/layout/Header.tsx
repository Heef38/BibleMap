import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router'
import { IconArrowLeft, IconArrowRight, IconHeart, IconInfo, IconMessage, IconMoon, IconPanelLeft, IconPanelRight, IconSearch, IconSettings, IconSun, Logo } from '@/components/common/icons'
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
    <button type="button" className="btn btn-ghost" onClick={() => set({ theme: dark ? 'light' : 'dark' })} title={dark ? 'Switch to light' : 'Switch to dark'}>
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

/**
 * Back and Forward through this visit, reader jumps included. Back stops at the first page of the
 * visit instead of leaving the site; Forward is on when a Back step can be undone.
 */
function HistoryButtons() {
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
    <div className="flex items-center" role="group" aria-label="History">
      <button type="button" className="btn btn-ghost !px-2" disabled={pos.idx <= 0} onClick={() => navigate(-1)} title="Back (Alt+←)" aria-label="Back">
        <IconArrowLeft />
      </button>
      <button type="button" className="btn btn-ghost !px-2" disabled={pos.idx >= pos.max} onClick={() => navigate(1)} title="Forward (Alt+→)" aria-label="Forward">
        <IconArrowRight />
      </button>
    </div>
  )
}

export default function Header() {
  const showLeft = useSettings((s) => s.showLeft)
  const showRight = useSettings((s) => s.showRight)
  const set = useSettings((s) => s.set)
  const focusSearch = useSession((s) => s.focusSearch)
  const [open, setOpen] = useState(false)
  return (
    <header className="h-12 shrink-0 flex items-center gap-3 max-[480px]:gap-1.5 px-3 max-[480px]:px-2 border-b border-line bg-surface relative z-20">
      <Link to="/" className="flex items-center gap-2 font-semibold text-ink hover:no-underline" title="BibleMap home">
        <Logo />
        <span className="max-[480px]:hidden">BibleMap</span>
      </Link>
      <HistoryButtons />
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
        {SITE.donateUrl && (
          <a href={SITE.donateUrl} target="_blank" rel="noopener noreferrer" className="btn hover:no-underline" style={{ color: 'var(--ink)' }} title="Support BibleMap">
            <IconHeart className="text-wj" />
            <span className="max-[480px]:hidden">Donate</span>
          </a>
        )}
      </nav>
      <span className="w-px h-5 bg-line" aria-hidden />
      <div className="flex items-center gap-1">
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
        <button type="button" className="btn btn-ghost max-[900px]:hidden" aria-pressed={showRight} onClick={() => set({ showRight: !showRight })} title={showRight ? 'Hide the reading pane ( ] )' : 'Show the reading pane ( ] )'}>
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
