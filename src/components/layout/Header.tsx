import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { IconMoon, IconPanelLeft, IconPanelRight, IconSearch, IconSettings, IconSun, Logo } from '@/components/common/icons'
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
          <Link to="/credits" onClick={onClose}>
            Data sources and licenses
          </Link>
        </div>
      </div>
    </>
  )
}

export default function Header() {
  const showLeft = useSettings((s) => s.showLeft)
  const showRight = useSettings((s) => s.showRight)
  const set = useSettings((s) => s.set)
  const focusSearch = useSession((s) => s.focusSearch)
  const [open, setOpen] = useState(false)
  return (
    <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-line bg-surface relative z-20">
      <Link to="/" className="flex items-center gap-2 font-semibold text-ink hover:no-underline">
        <Logo />
        BibleMap
      </Link>
      <span className="text-muted text-xs max-[900px]:hidden">see how the story connects</span>
      <div className="ml-auto flex items-center gap-1">
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
