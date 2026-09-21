import type { RefObject } from 'react'

interface Props {
  /** the box the share is measured against */
  box: RefObject<HTMLDivElement | null>
  /** 'col' sits between two columns and drags sideways; 'row' sits between two rows */
  dir: 'col' | 'row'
  /** the share of the box before the splitter ('col': left of it) or after it ('row': below it) */
  value: number
  min: number
  max: number
  label: string
  onDrag: (v: number | null) => void
  onCommit: (v: number) => void
  /** double-click puts it back here */
  reset?: number
}

/** A thin bar between two panes: drag it, or focus it and use the arrow keys. */
export default function Splitter({ box, dir, value, min, max, label, onDrag, onCommit, reset }: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const at = (x: number, y: number) => {
    const r = box.current!.getBoundingClientRect()
    return clamp(dir === 'col' ? (x - r.left) / r.width : (r.bottom - y) / r.height)
  }
  const col = dir === 'col'
  return (
    <div
      role="separator"
      aria-orientation={col ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      title={`${label} (drag, or double-click to reset)`}
      className={`splitter splitter-${dir} shrink-0 touch-none select-none relative z-20`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onDrag(at(e.clientX, e.clientY))
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onDrag(at(e.clientX, e.clientY))
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        onCommit(at(e.clientX, e.clientY))
        onDrag(null)
      }}
      onPointerCancel={() => onDrag(null)}
      onDoubleClick={() => reset !== undefined && onCommit(reset)}
      onKeyDown={(e) => {
        const less = col ? 'ArrowLeft' : 'ArrowDown'
        const more = col ? 'ArrowRight' : 'ArrowUp'
        if (e.key !== less && e.key !== more) return
        e.preventDefault()
        onCommit(clamp(value + (e.key === more ? 0.03 : -0.03)))
      }}
    />
  )
}
