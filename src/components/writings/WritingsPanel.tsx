import { Link, useLocation } from 'react-router'
import { IconDown, IconNote, IconUp } from '@/components/common/icons'
import { useData } from '@/data/useData'
import { loadWritingsIndex } from '@/data/loaders'
import { useSettings } from '@/store/settings'

/** The writings, at the foot of the left pane: each opens beside the Bible. */
export default function WritingsPanel() {
  const { data: writings } = useData('writings-index', loadWritingsIndex)
  const open = useSettings((s) => s.writingsOpen)
  const set = useSettings((s) => s.set)
  const { pathname } = useLocation()
  const toggle = () => set({ writingsOpen: !open })

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-1 pl-3 pr-1.5 h-10 shrink-0">
        <button type="button" className="flex items-center gap-1.5 min-w-0 text-left" onClick={toggle} aria-expanded={open} title={open ? 'Fold the writings away' : 'Show the writings'}>
          <IconNote className="text-muted shrink-0" />
          <span className="kicker">Writings</span>
          {writings && writings.length > 0 && <span className="text-xs text-muted">{writings.length}</span>}
        </button>
        <button type="button" className="btn btn-ghost !px-1.5 ml-auto" onClick={toggle} title={open ? 'Fold the writings away' : 'Show the writings'} aria-label={open ? 'Fold the writings away' : 'Show the writings'}>
          {open ? <IconDown /> : <IconUp />}
        </button>
      </div>
      {open && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
          <ul className="-mx-2">
            {(writings ?? []).map((w) => {
              const here = pathname === `/writing/${w.id}`
              return (
                <li key={w.id}>
                  <Link
                    to={`/writing/${w.id}`}
                    aria-current={here ? 'page' : undefined}
                    className={`block rounded-lg px-2 py-1.5 text-ink hover:no-underline ${here ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}
                  >
                    <div className="text-sm font-medium leading-snug">{w.title}</div>
                    <div className="text-xs text-muted">By {w.author}</div>
                  </Link>
                </li>
              )
            })}
          </ul>
          {writings && writings.length > 1 && (
            <Link to="/writings" className="inline-block mt-1 text-xs">
              All writings →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
