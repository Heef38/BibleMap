import { useEffect, useRef, type ReactNode } from 'react'

export interface PopoverState {
  x: number
  y: number
  title: string
  body?: ReactNode
  action?: { label: string; run: () => void }
  /** a second, quieter action */
  extra?: { label: string; run: () => void }
}

/** A small card pinned near a click point; closes on Escape or an outside click. */
export function Popover({ state, onClose }: { state: PopoverState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => window.addEventListener('pointerdown', onDown), 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [state, onClose])
  if (!state) return null
  const W = 300
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, state.x - W / 2))
  const top = state.y + 14 + 160 > window.innerHeight ? state.y - 14 - 150 : state.y + 14
  return (
    <div ref={ref} role="dialog" aria-label={state.title} className="fixed z-40 rounded-xl border border-line-strong bg-surface p-3 text-sm" style={{ left, top, width: W, boxShadow: 'var(--shadow)' }}>
      <div className="font-semibold pr-6">{state.title}</div>
      {state.body && <div className="text-ink-2 mt-1 leading-snug">{state.body}</div>}
      <div className="flex items-center gap-2 mt-2">
        {state.action && (
          <button type="button" className="btn btn-primary !py-1" onClick={state.action.run}>
            {state.action.label}
          </button>
        )}
        {state.extra && (
          <button type="button" className="btn !py-1" onClick={state.extra.run}>
            {state.extra.label}
          </button>
        )}
        <button type="button" className="btn btn-ghost !py-1 ml-auto" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
