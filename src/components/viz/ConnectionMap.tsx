import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import { useWidth } from '@/lib/hooks'
import { truncate } from '@/lib/format'

export interface MapDot {
  id: string
  label: string
  color: string
  r: number
  /** drawn solid (e.g. words of Jesus); otherwise tinted */
  solid?: boolean
  sub?: string
  note?: string
  snippet?: string
}
export interface MapBranch {
  id: string
  title: string
  note?: string
  color: string
  dots: MapDot[]
  /** automatic connections are drawn quieter than authored ones */
  muted?: boolean
  /** the popup offers to zoom into this branch */
  focusable?: boolean
}
export interface MapCenter {
  label: string
  sub?: string
}

interface Props {
  center: MapCenter
  branches: MapBranch[]
  canBack: boolean
  /** `at` is where the dot was clicked, for a popup */
  onDot: (dot: MapDot, branch: MapBranch, at: { x: number; y: number }) => void
  onBranch: (branch: MapBranch, at: { x: number; y: number }) => void
  onCenter: () => void
  height?: number
  /** the line above the map, and the last line of a dot's tooltip */
  hint?: string
  dotHint?: string
}

const CENTER_R = 34
const TAU = Math.PI * 2

export default function ConnectionMap({ center, branches, canBack, onDot, onBranch, onCenter, height = 560, hint = 'Click a dot to zoom into it, a line for its theme.', dotHint = 'click to zoom in' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const width = useWidth(wrapRef)
  const h = Math.min(height, Math.max(360, Math.round(width * 0.8)))
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity)
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const layout = useMemo(() => {
    const N = Math.max(1, branches.length)
    const R = Math.max(110, Math.min(width / 2 - 150, h / 2 - 56)) // room for a label beyond each tip
    return branches.map((b, i) => {
      const angle = -Math.PI / 2 + (TAU * i) / N
      const n = b.dots.length
      const desired = n <= 3 ? 40 + 60 * n : 56 + 16 * n
      // Stop short of the edge so the label past the tip stays in view (it matters on phones).
      const cos = Math.abs(Math.cos(angle))
      const sin = Math.abs(Math.sin(angle))
      const labelW = (Math.min(24, b.title.length) + 3) * 6.6
      const room = Math.min(cos > 0.2 ? (width / 2 - 16 - labelW) / cos : Infinity, sin > 0.2 ? (h / 2 - 24) / sin : Infinity)
      const len = Math.max(CENTER_R + 36, Math.min(Math.max(96, Math.min(Math.max(R, 120), desired)), room))
      const spacing = (len - CENTER_R - 10) / (n + 1)
      const crowded = spacing < 11
      const dots = b.dots.map((d, k) => {
        const t = CENTER_R + 10 + (k + 1) * spacing
        const perp = crowded ? (k % 2 ? 6 : -6) : 0
        return { dot: d, x: Math.cos(angle) * t - Math.sin(angle) * perp, y: Math.sin(angle) * t + Math.cos(angle) * perp, r: crowded ? Math.min(d.r, 3.5) : d.r, side: k % 2 ? 1 : -1 }
      })
      // A label beside its tip gets the characters that fit before the edge (the tooltip has it whole).
      const labelChars = cos > 0.2 ? Math.max(6, Math.min(24, Math.floor((width / 2 - 28 - cos * len) / 6.6) - 3)) : 24
      return { branch: b, angle, len, tip: { x: Math.cos(angle) * len, y: Math.sin(angle) * len }, dots, labelDots: spacing >= 34, labelChars }
    })
  }, [branches, width, h])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || width <= 0) return
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 8])
      .filter((e: Event) => {
        if (e.type === 'wheel') return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey
        return !(e as MouseEvent).button
      })
      .on('zoom', (e) => setTransform(e.transform))
    zoomRef.current = zoom
    const sel = d3.select(svg)
    sel.call(zoom)
    sel.on('dblclick.zoom', null)
    return () => {
      sel.on('.zoom', null)
    }
  }, [width])

  // A new focus resets the view.
  useEffect(() => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity)
  }, [center.label])

  const zoomBy = (f: number) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, f)
  }
  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity)
  }

  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })
  const centerLines = wrap(center.label, 13)

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5 text-[11px] text-muted">
        <span className="flex-1 basis-56 min-w-0">{hint}</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
        <span>drag to pan · ctrl + scroll to zoom</span>
        <div className="seg">
          <button type="button" onClick={() => zoomBy(1.5)} title="Zoom in" aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.5)} title="Zoom out" aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={reset} title="Reset the view">
            reset
          </button>
        </div>
        </div>
      </div>
      {width > 0 && (
        <svg ref={svgRef} width={width} height={h} viewBox={`${-width / 2} ${-h / 2} ${width} ${h}`} className="block select-none touch-none rounded-xl border border-line bg-surface" role="img" aria-label={`Connection map of ${center.label}`} style={{ cursor: 'grab' }}>
          <g transform={transform.toString()}>
            {/* branch lines */}
            {layout.map(({ branch: b, tip: t, angle, labelChars }) => {
              const hovered = hover === `b:${b.id}`
              const color = b.muted ? 'var(--line-strong)' : b.color
              const cos = Math.cos(angle)
              const sin = Math.sin(angle)
              const lx = t.x + cos * 12
              const ly = t.y + sin * 12
              const anchor = cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle'
              const dy = sin > 0.5 ? 12 : sin < -0.5 ? -4 : 4
              return (
                <g key={b.id}>
                  <line x1={0} y1={0} x2={t.x} y2={t.y} stroke={color} strokeWidth={hovered ? 2.5 : b.muted ? 1.25 : 1.75} strokeLinecap="round" opacity={b.muted ? 0.8 : 0.9} />
                  <line
                    x1={0}
                    y1={0}
                    x2={t.x}
                    y2={t.y}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.title}: ${b.dots.length} connections`}
                    onClick={(e) => onBranch(b, { x: e.clientX, y: e.clientY })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const r = (e.target as SVGElement).getBoundingClientRect()
                        onBranch(b, { x: r.x + r.width / 2, y: r.y + r.height / 2 })
                      }
                    }}
                    onPointerMove={(e) => {
                      setHover(`b:${b.id}`)
                      showTip(
                        e,
                        <>
                          <div className="v">{b.title}</div>
                          <div className="k">
                            {b.dots.length} connection{b.dots.length === 1 ? '' : 's'}
                            {b.note ? ` · click for the theme` : ''}
                          </div>
                        </>,
                      )
                    }}
                    onPointerLeave={() => {
                      setHover(null)
                      setTip(null)
                    }}
                  />
                  <text
                    x={lx}
                    y={ly + dy}
                    textAnchor={anchor}
                    fontSize={11.5}
                    fontWeight={600}
                    fill={b.muted ? 'var(--muted)' : 'var(--ink)'}
                    style={{ cursor: 'pointer', paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3, strokeLinejoin: 'round' }}
                    onClick={(e) => onBranch(b, { x: e.clientX, y: e.clientY })}
                  >
                    {truncate(b.title, labelChars)}
                    <tspan fill="var(--muted)" fontWeight={400}>
                      {' '}
                      {b.dots.length}
                    </tspan>
                  </text>
                </g>
              )
            })}
            {/* dots */}
            {layout.map(({ branch: b, dots, angle, labelDots }) =>
              dots.map(({ dot: d, x, y, r, side }) => {
                const key = `${b.id}:${d.id}`
                const hovered = hover === key
                const fill = d.solid ? d.color : `color-mix(in oklab, ${d.color} 58%, var(--surface))`
                const deg = (angle * 180) / Math.PI
                const flip = Math.cos(angle) < -0.01
                return (
                  <g key={key}>
                    <circle cx={x} cy={y} r={r} fill={fill} stroke={hovered ? 'var(--ink)' : 'var(--surface)'} strokeWidth={hovered ? 2 : 1.5} />
                    <circle
                      cx={x}
                      cy={y}
                      r={Math.max(12, r + 7)}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label={d.label}
                      onClick={(e) => onDot(d, b, { x: e.clientX, y: e.clientY })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          const r = (e.target as SVGElement).getBoundingClientRect()
                          onDot(d, b, { x: r.x + r.width / 2, y: r.y + r.height / 2 })
                        }
                      }}
                      onPointerMove={(e) => {
                        setHover(key)
                        showTip(
                          e,
                          <>
                            <div className="v">{d.label}</div>
                            {d.sub && <div className="k">{d.sub}</div>}
                            {d.note && <div className="k mt-1">{truncate(d.note, 140)}</div>}
                            {d.snippet && <div className="mt-1 font-serif">{truncate(d.snippet, 140)}</div>}
                            <div className="k mt-1">{dotHint}</div>
                          </>,
                        )
                      }}
                      onPointerLeave={() => {
                        setHover(null)
                        setTip(null)
                      }}
                    />
                    {labelDots && (
                      <text
                        transform={`translate(${x},${y}) rotate(${flip ? deg + 180 : deg}) translate(0,${(flip ? -side : side) > 0 ? 14 : -9})`}
                        textAnchor="middle"
                        fontSize={9.5}
                        fill="var(--ink-2)"
                        pointerEvents="none"
                        style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 2.5, strokeLinejoin: 'round' }}
                      >
                        {truncate(d.label, 18)}
                      </text>
                    )}
                  </g>
                )
              }),
            )}
            {/* center */}
            <g
              role="button"
              tabIndex={0}
              aria-label={canBack ? `${center.label}. Go back` : center.label}
              style={{ cursor: canBack ? 'pointer' : 'default' }}
              onClick={onCenter}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCenter()}
            >
              <circle r={CENTER_R + 4} fill="var(--surface)" />
              <circle r={CENTER_R} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={2} />
              {centerLines.map((line, i) => (
                <text key={i} y={(i - (centerLines.length - 1) / 2) * 12 + 4 - (canBack ? 4 : 0)} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--ink)">
                  {line}
                </text>
              ))}
              {canBack && (
                <text y={CENTER_R - 8} textAnchor="middle" fontSize={9} fill="var(--accent)">
                  ← back
                </text>
              )}
            </g>
          </g>
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
  if (lines.length > 3) return [...lines.slice(0, 2), truncate(lines.slice(2).join(' '), maxChars)]
  return lines
}
