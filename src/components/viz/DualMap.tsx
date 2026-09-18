import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import { useWidth } from '@/lib/hooks'
import { truncate } from '@/lib/format'

export interface DualDot {
  id: string
  label: string
  sub?: string
  snippet?: string
  color?: string
  r?: number
}
export interface DualBranch {
  id: string
  title: string
  dots: DualDot[]
  color: string
  /** how many more there are beyond the dots shown */
  more?: number
}
export interface DualCenter {
  label: string
  sub?: string
  color: string
}

interface Props {
  a: DualCenter
  b: DualCenter
  /** what the two share, drawn as bridges between them */
  bridges: DualBranch[]
  /** what belongs to A alone (fans out to the left) and to B alone (to the right) */
  left: DualBranch[]
  right: DualBranch[]
  onDot: (dot: DualDot, branch: DualBranch) => void
  onCenter?: (which: 'a' | 'b') => void
}

const CR = 30

/** Two people on one map: bridges for what they share, branches for what is theirs alone. */
export default function DualMap({ a, b, bridges, left, right, onDot, onCenter }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const h = Math.max(380, Math.min(600, Math.round(width * 0.62)))
  const ax = width * 0.28
  const bx = width * 0.72
  const cy = h / 2

  const layout = useMemo(() => {
    const bridgeRows = bridges.map((br, i) => {
      const y = cy + (i - (bridges.length - 1) / 2) * 52
      const x0 = ax + CR + 34
      const x1 = bx - CR - 34
      const n = br.dots.length
      const spacing = (x1 - x0) / (n + 1)
      const crowded = spacing < 12
      return {
        branch: br,
        y,
        x0,
        x1,
        dots: br.dots.map((d, k) => ({ dot: d, x: x0 + (k + 1) * spacing, y: y + (crowded ? (k % 2 ? 5 : -5) : 0), r: crowded ? 3.5 : (d.r ?? 4.5) })),
      }
    })
    const side = (branches: DualBranch[], cx: number, dir: -1 | 1) => {
      const maxLen = Math.max(90, Math.min(220, (dir < 0 ? cx : width - cx) - CR - 16))
      return branches.map((br, k) => {
        const spread = Math.min(50, 120 / Math.max(1, branches.length - 1))
        const deg = (dir < 0 ? 180 : 0) + (k - (branches.length - 1) / 2) * spread
        const angle = (deg * Math.PI) / 180
        const n = br.dots.length
        const len = Math.max(80, Math.min(maxLen, 48 + 16 * n))
        const spacing = (len - CR - 8) / (n + 1)
        const crowded = spacing < 11
        const dots = br.dots.map((d, j) => {
          const t = CR + 8 + (j + 1) * spacing
          const perp = crowded ? (j % 2 ? 6 : -6) : 0
          return { dot: d, x: cx + Math.cos(angle) * t - Math.sin(angle) * perp, y: cy + Math.sin(angle) * t + Math.cos(angle) * perp, r: crowded ? 3.5 : (d.r ?? 4.5) }
        })
        return { branch: br, angle, len, tip: { x: cx + Math.cos(angle) * len, y: cy + Math.sin(angle) * len }, dots, dir }
      })
    }
    return { bridgeRows, leftBranches: side(left, ax, -1), rightBranches: side(right, bx, 1) }
  }, [bridges, left, right, width, ax, bx, cy])

  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })
  const dotNode = (br: DualBranch, d: DualDot, x: number, y: number, r: number, color: string) => {
    const key = `${br.id}:${d.id}`
    const hovered = hover === key
    return (
      <g key={key}>
        <circle cx={x} cy={y} r={r} fill={d.color ?? color} stroke={hovered ? 'var(--ink)' : 'var(--surface)'} strokeWidth={hovered ? 2 : 1.5} />
        <circle
          cx={x}
          cy={y}
          r={Math.max(12, r + 7)}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-label={d.label}
          onClick={() => onDot(d, br)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onDot(d, br)
            }
          }}
          onPointerMove={(e) => {
            setHover(key)
            showTip(
              e,
              <>
                <div className="v">{d.label}</div>
                {d.sub && <div className="k">{d.sub}</div>}
                {d.snippet && <div className="mt-1 font-serif">{truncate(d.snippet, 140)}</div>}
              </>,
            )
          }}
          onPointerLeave={() => {
            setHover(null)
            setTip(null)
          }}
        />
      </g>
    )
  }
  const centerNode = (c: DualCenter, cx: number, which: 'a' | 'b') => {
    const lines = wrap(c.label, 12)
    return (
      <g role={onCenter ? 'button' : undefined} tabIndex={onCenter ? 0 : undefined} style={{ cursor: onCenter ? 'pointer' : 'default' }} onClick={() => onCenter?.(which)} aria-label={c.label}>
        <circle cx={cx} cy={cy} r={CR + 4} fill="var(--surface)" />
        <circle cx={cx} cy={cy} r={CR} fill={`color-mix(in oklab, ${c.color} 22%, var(--surface))`} stroke={c.color} strokeWidth={2.5} />
        {lines.map((line, i) => (
          <text key={i} x={cx} y={cy + (i - (lines.length - 1) / 2) * 12 + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ink)">
            {line}
          </text>
        ))}
      </g>
    )
  }

  return (
    <div ref={wrapRef} className="w-full">
      {width > 0 && (
        <svg width={width} height={h} className="block select-none rounded-xl border border-line bg-surface" role="img" aria-label={`${a.label} and ${b.label}: what they share and what is theirs alone`}>
          {/* bridges */}
          {layout.bridgeRows.map(({ branch: br, y, x0, x1, dots }) => (
            <g key={br.id}>
              <path d={`M${ax + CR},${cy} C${ax + CR + 30},${cy} ${x0 - 20},${y} ${x0},${y} L${x1},${y} C${x1 + 20},${y} ${bx - CR - 30},${cy} ${bx - CR},${cy}`} fill="none" stroke={br.color} strokeWidth={1.75} opacity={0.85} />
              <text x={(x0 + x1) / 2} y={y - 12} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--ink)" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3, strokeLinejoin: 'round' }}>
                {br.title}
                <tspan fill="var(--muted)" fontWeight={400}>
                  {' '}
                  {br.dots.length + (br.more ?? 0)}
                </tspan>
              </text>
              {dots.map(({ dot: d, x, y: dy, r }) => dotNode(br, d, x, dy, r, br.color))}
            </g>
          ))}
          {/* unique branches */}
          {[...layout.leftBranches, ...layout.rightBranches].map(({ branch: br, tip: t, angle, dots, dir }) => {
            const cx = dir < 0 ? ax : bx
            const deg = (angle * 180) / Math.PI
            // The label runs along the branch, just above the line, ending at the tip.
            const flip = dir < 0
            return (
              <g key={`${dir}:${br.id}`}>
                <line x1={cx} y1={cy} x2={t.x} y2={t.y} stroke={br.color} strokeWidth={1.75} strokeLinecap="round" opacity={0.85} />
                <text transform={`translate(${t.x},${t.y}) rotate(${flip ? deg + 180 : deg}) translate(${flip ? 4 : -4},-9)`} textAnchor={flip ? 'start' : 'end'} fontSize={11} fontWeight={600} fill="var(--ink)" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3, strokeLinejoin: 'round' }}>
                  {truncate(br.title, 22)}
                  <tspan fill="var(--muted)" fontWeight={400}>
                    {' '}
                    {br.dots.length + (br.more ?? 0)}
                  </tspan>
                </text>
                {dots.map(({ dot: d, x, y, r }) => dotNode(br, d, x, y, r, br.color))}
              </g>
            )
          })}
          {centerNode(a, ax, 'a')}
          {centerNode(b, bx, 'b')}
        </svg>
      )}
      <VizTooltip tip={tip} />
    </div>
  )
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}
