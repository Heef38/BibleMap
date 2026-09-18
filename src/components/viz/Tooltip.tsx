import type { ReactNode } from 'react'

export interface TipState {
  x: number
  y: number
  content: ReactNode
}

/** A pointer-following tooltip. Values lead, labels follow. */
export function VizTooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = tip.x + 14 + 320 > vw ? tip.x - 14 - 320 : tip.x + 14
  const top = tip.y + 14 + 120 > vh ? tip.y - 14 - 100 : tip.y + 14
  return (
    <div className="viz-tooltip" style={{ left, top }} role="tooltip">
      {tip.content}
    </div>
  )
}
