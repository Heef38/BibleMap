import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import { useWidth } from '@/lib/hooks'
import { formatYear } from '@/lib/format'

export interface TimelineItem {
  id: string
  label: string
  year: number
  /** end year for things that last (drawn as a bar when wide enough) */
  end?: number
  color?: string
  sub?: string
  /** id of the lane this item belongs to, when lanes are used */
  lane?: string
}
export interface TimelineBand {
  id: string
  label: string
  start: number
  end: number
  color?: string
  sub?: string
  emphasis?: boolean
}
export interface TimelineBin {
  year: number
  count: number
  ordinals: number[]
}
/** A labeled row of the timeline; items are assigned to lanes by id. */
export interface TimelineLane {
  id: string
  label: string
  color?: string
  /** the years this lane covers, drawn as a faint band behind its items */
  span?: [number, number]
  sub?: string
  muted?: boolean
}

interface Props {
  items: TimelineItem[]
  bands?: TimelineBand[]
  bins?: TimelineBin[]
  /** fixed, labeled rows (themes); without lanes, items are packed automatically */
  lanes?: TimelineLane[]
  /** the years shown at first; the full extent of the data is always reachable */
  initialDomain?: [number, number]
  /** when this changes, the view animates to show these years (undefined = everything) */
  focusDomain?: [number, number] | null
  binLabel?: string
  selectedId?: string | null
  onItem?: (item: TimelineItem) => void
  onBand?: (band: TimelineBand) => void
  onBin?: (bin: TimelineBin) => void
  onLane?: (lane: TimelineLane) => void
  maxItemLanes?: number
}

const BAND_H = 16
const ITEM_H = 20
const LANE_GAP = 4
const HIST_H = 44
const AXIS_H = 26
const PAD_TOP = 8
const LABEL_PX = 6.1
const LANE_PAD = 6
const MAX_SUB = 4

interface Placed<T> {
  ref: T
  x0: number
  x1: number
  lane: number
}

/** Greedy interval packing into lanes; anything past maxLanes lands in the last lane unlabeled. */
function packLanes<T>(spans: { ref: T; x0: number; x1: number }[], maxLanes: number): { placed: Placed<T>[]; lanes: number; overflow: Set<T> } {
  const sorted = [...spans].sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1)
  const laneEnds: number[] = []
  const placed: Placed<T>[] = []
  const overflow = new Set<T>()
  for (const s of sorted) {
    let lane = laneEnds.findIndex((end) => end + 4 <= s.x0)
    if (lane < 0) {
      if (laneEnds.length < maxLanes) {
        lane = laneEnds.length
        laneEnds.push(s.x1)
      } else {
        lane = maxLanes - 1
        overflow.add(s.ref)
      }
    } else laneEnds[lane] = s.x1
    placed.push({ ...s, lane })
  }
  return { placed, lanes: laneEnds.length, overflow }
}

export default function Timeline({ items, bands = [], bins = [], lanes, initialDomain, focusDomain, binLabel = 'verses', selectedId, onItem, onBand, onBin, onLane, maxItemLanes = 10 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const width = useWidth(wrapRef)
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity)
  const [tip, setTip] = useState<TipState | null>(null)
  const GUTTER = lanes ? Math.min(160, Math.max(110, Math.round(width * 0.18))) : 0
  const clipId = useRef(`tl-clip-${Math.random().toString(36).slice(2, 8)}`)

  const fullDomain = useMemo<[number, number]>(() => {
    const ys: number[] = []
    for (const i of items) ys.push(i.year, i.end ?? i.year)
    for (const b of bands) ys.push(b.start, b.end)
    for (const b of bins) ys.push(b.year)
    for (const l of lanes ?? []) if (l.span) ys.push(l.span[0], l.span[1])
    if (!ys.length) return [-4000, 100]
    let lo = Math.min(...ys)
    let hi = Math.max(...ys)
    const pad = Math.max(1, (hi - lo) * 0.03)
    lo -= pad
    hi += pad
    return [lo, hi]
  }, [items, bands, bins, lanes])

  const baseX = useMemo(() => d3.scaleLinear().domain(fullDomain).range([GUTTER, Math.max(GUTTER + 1, width)]), [fullDomain, width, GUTTER])
  const x = useMemo(() => transform.rescaleX(baseX), [transform, baseX])

  const itemSpan = (i: TimelineItem) => {
    const x0 = x(i.year)
    const barEnd = i.end !== undefined ? x(i.end) : x0
    const labelW = Math.min(i.label.length * LABEL_PX + 18, 200)
    return { ref: i, x0: x0 - 6, x1: Math.max(barEnd, x0) + labelW }
  }

  // Lay out bands and items against the current scale.
  const bandLayout = useMemo(() => {
    const spans = bands.map((b) => {
      const x0 = x(b.start)
      const x1 = Math.max(x(b.end), x0 + 6)
      return { ref: b, x0: Math.min(x0, x1), x1: Math.max(x1, x0 + Math.min(b.label.length * LABEL_PX + 12, 160)) }
    })
    return packLanes(spans, 6)
  }, [bands, x])
  const itemLayout = useMemo(() => {
    if (lanes) return { placed: [] as Placed<TimelineItem>[], lanes: 0, overflow: new Set<TimelineItem>() }
    return packLanes(items.map(itemSpan), maxItemLanes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, x, maxItemLanes, lanes])
  const laneLayout = useMemo(() => {
    if (!lanes) return []
    let top = 0
    return lanes.map((lane) => {
      const mine = items.filter((i) => i.lane === lane.id)
      const packed = packLanes(mine.map(itemSpan), MAX_SUB)
      const subLanes = Math.max(1, packed.lanes)
      const h = subLanes * (ITEM_H + LANE_GAP) + LANE_PAD * 2
      const beyondRight = mine.filter((i) => x(i.year) > width).length
      const beyondLeft = mine.filter((i) => x(i.end ?? i.year) < GUTTER).length
      const out = { lane, packed, subLanes, top, h, beyondRight, beyondLeft }
      top += h
      return out
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, items, x, width, GUTTER])

  const bandsTop = PAD_TOP
  const bandsH = bandLayout.lanes ? bandLayout.lanes * (BAND_H + LANE_GAP) : 0
  const itemsTop = bandsTop + bandsH + (bandsH ? 6 : 0)
  const itemsH = lanes ? laneLayout.reduce((s, l) => s + l.h, 0) : itemLayout.lanes ? itemLayout.lanes * (ITEM_H + LANE_GAP) : 0
  const histTop = itemsTop + itemsH + (itemsH ? 6 : 0)
  const histH = bins.length ? HIST_H : 0
  const axisTop = histTop + histH + 4
  const height = axisTop + AXIS_H

  // Aggregate the histogram into pixel-sized bins for the current zoom.
  const hist = useMemo(() => {
    if (!bins.length) return { bars: [] as { x0: number; x1: number; count: number; year: number; span: number; ordinals: number[] }[], max: 1 }
    const ppy = Math.abs(x(1) - x(0))
    const span = Math.max(1, Math.round(4 / Math.max(ppy, 1e-9)))
    const groups = new Map<number, { count: number; ordinals: number[] }>()
    for (const b of bins) {
      const k = Math.floor(b.year / span) * span
      const g = groups.get(k) ?? { count: 0, ordinals: [] }
      g.count += b.count
      g.ordinals.push(...b.ordinals)
      groups.set(k, g)
    }
    const bars = [...groups.entries()].map(([year, g]) => ({ year, span, x0: x(year), x1: x(year + span), count: g.count, ordinals: g.ordinals }))
    return { bars, max: Math.max(1, ...bars.map((b) => b.count)) }
  }, [bins, x])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || width <= 0) return
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 5000])
      .translateExtent([
        [GUTTER, 0],
        [width, height],
      ])
      .extent([
        [GUTTER, 0],
        [width, height],
      ])
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
  }, [width, height, GUTTER])

  const transformFor = (a: number, b: number) => {
    const k = Math.max(1, Math.min(5000, (fullDomain[1] - fullDomain[0]) / Math.max(1e-6, b - a)))
    return d3.zoomIdentity.translate(GUTTER - baseX(a) * k, 0).scale(k)
  }

  // Apply the initial domain once the width is known.
  const initialApplied = useRef(false)
  useEffect(() => {
    if (initialApplied.current || width <= 0 || !zoomRef.current || !svgRef.current) return
    initialApplied.current = true
    if (!initialDomain) return
    d3.select(svgRef.current).call(zoomRef.current.transform, transformFor(initialDomain[0], initialDomain[1]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, initialDomain, fullDomain, baseX])

  const focusKey = focusDomain ? `${focusDomain[0]}:${focusDomain[1]}` : ''
  const lastFocus = useRef<string | null>(null)
  useEffect(() => {
    if (!initialApplied.current || !zoomRef.current || !svgRef.current) return
    if (lastFocus.current === null) {
      lastFocus.current = focusKey
      return
    }
    if (lastFocus.current === focusKey) return
    lastFocus.current = focusKey
    const sel = d3.select(svgRef.current).transition().duration(400)
    if (!focusDomain) {
      sel.call(zoomRef.current.transform, d3.zoomIdentity)
      return
    }
    sel.call(zoomRef.current.transform, transformFor(focusDomain[0], focusDomain[1]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, width])

  const zoomBy = (f: number) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, f)
  }
  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity)
  }
  const zoomTo = (a: number, b: number) => {
    if (!svgRef.current || !zoomRef.current) return
    const pad = Math.max(1, (b - a) * 0.08)
    d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, transformFor(a - pad, b + pad))
  }

  const ticks = useMemo(() => x.ticks(Math.max(2, Math.floor((width - GUTTER) / 110))).filter((t) => Number.isInteger(t)), [x, width, GUTTER])
  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })
  const yearsLabel = (a: number, b?: number) => (b !== undefined && Math.round(b) !== Math.round(a) ? `${formatYear(Math.round(a))} – ${formatYear(Math.round(b))}` : formatYear(Math.round(a)))

  const renderItem = (it: TimelineItem, y: number, hidden: boolean) => {
    const cx = x(it.year)
    const color = it.color ?? 'var(--series-1)'
    const barEnd = it.end !== undefined ? x(it.end) : cx
    const isBar = barEnd - cx >= 6
    const selected = selectedId === it.id
    const maxChars = 30
    const label = it.label.length > maxChars ? `${it.label.slice(0, maxChars - 1)}…` : it.label
    return (
      <g
        key={it.id}
        role="button"
        tabIndex={0}
        aria-label={`${it.label}, ${yearsLabel(it.year, it.end)}`}
        style={{ cursor: 'pointer' }}
        onClick={() => onItem?.(it)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onItem?.(it)}
        onPointerMove={(e) =>
          showTip(
            e,
            <>
              <div className="v">{it.label}</div>
              <div className="k">{yearsLabel(it.year, it.end)}</div>
              {it.sub && <div className="k">{it.sub}</div>}
            </>,
          )
        }
        onPointerLeave={() => setTip(null)}
      >
        <rect x={cx - 8} y={y - ITEM_H / 2} width={Math.max(16, barEnd - cx + 16) + (hidden ? 0 : Math.min(it.label.length * LABEL_PX + 10, 200))} height={ITEM_H} fill="transparent" />
        {isBar ? (
          <rect x={cx} y={y - 4} width={barEnd - cx} height={8} rx={3} fill={color} opacity={0.85} stroke={selected ? 'var(--ink)' : 'var(--surface)'} strokeWidth={selected ? 1.5 : 1} />
        ) : (
          <circle cx={cx} cy={y} r={selected ? 6 : 5} fill={color} stroke={selected ? 'var(--ink)' : 'var(--surface)'} strokeWidth={2} />
        )}
        {!hidden && (
          <text x={(isBar ? barEnd : cx) + 8} y={y + 3.5} fontSize={11} fill="var(--ink)" fontWeight={selected ? 600 : 400} style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3, strokeLinejoin: 'round' }}>
            {label}
          </text>
        )}
      </g>
    )
  }

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex items-center gap-2 mb-1.5 text-[11px] text-muted">
        <span>
          Showing {formatYear(Math.round(x.domain()[0]))} to {formatYear(Math.round(x.domain()[1]))}
        </span>
        <span className="ml-auto">drag to pan · ctrl + scroll to zoom{lanes ? ' · click a row title to zoom to it' : ''}</span>
        <div className="seg">
          <button type="button" onClick={() => zoomBy(2)} title="Zoom in" aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomBy(0.5)} title="Zoom out" aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={reset} title="Show everything">
            fit all
          </button>
        </div>
      </div>
      {width > 0 && (
        <svg ref={svgRef} width={width} height={height} className="block select-none touch-none" role="img" aria-label="Timeline" style={{ cursor: 'grab' }}>
          <defs>
            <clipPath id={clipId.current}>
              <rect x={GUTTER} y={0} width={Math.max(0, width - GUTTER)} height={height} />
            </clipPath>
          </defs>
          <rect x={0} y={0} width={width} height={height} fill="transparent" />
          {/* lane backgrounds and labels (outside the clip) */}
          {laneLayout.map(({ lane, top, h }, i) => (
            <g key={`bg-${lane.id}`}>
              <rect x={0} y={itemsTop + top} width={width} height={h} fill={i % 2 ? 'var(--surface-2)' : 'transparent'} opacity={0.55} />
              <line x1={0} x2={width} y1={itemsTop + top + h} y2={itemsTop + top + h} stroke="var(--grid)" strokeWidth={1} />
              <g
                role={onLane ? 'button' : undefined}
                tabIndex={onLane ? 0 : undefined}
                style={{ cursor: onLane || lane.span ? 'pointer' : 'default' }}
                onClick={() => (onLane ? onLane(lane) : lane.span && zoomTo(lane.span[0], lane.span[1]))}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (onLane ? onLane(lane) : lane.span && zoomTo(lane.span[0], lane.span[1]))}
                aria-label={`${lane.label}${lane.span ? `, ${yearsLabel(lane.span[0], lane.span[1])}` : ''}`}
              >
                <rect x={0} y={itemsTop + top} width={GUTTER} height={h} fill="transparent" />
                <circle cx={10} cy={itemsTop + top + 13} r={4} fill={lane.muted ? 'var(--muted)' : (lane.color ?? 'var(--series-1)')} />
                {wrapLabel(lane.label, Math.max(8, Math.floor((GUTTER - 24) / 6.4)), h >= 44 ? 2 : 1).map((line, li) => (
                  <text key={li} x={20} y={itemsTop + top + 17 + li * 13} fontSize={11} fontWeight={600} fill={lane.muted ? 'var(--muted)' : 'var(--ink)'}>
                    {line}
                  </text>
                ))}
                {lane.sub && h >= 58 && (
                  <text x={20} y={itemsTop + top + h - 8} fontSize={10} fill="var(--muted)">
                    {lane.sub}
                  </text>
                )}
              </g>
            </g>
          ))}
          <g clipPath={`url(#${clipId.current})`}>
            {/* gridlines */}
            {ticks.map((t) => (
              <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={axisTop} stroke="var(--grid)" strokeWidth={1} />
            ))}
            {/* lane spans */}
            {laneLayout.map(({ lane, top, h }) =>
              lane.span ? (
                <rect key={`span-${lane.id}`} x={x(lane.span[0])} y={itemsTop + top + 3} width={Math.max(3, x(lane.span[1]) - x(lane.span[0]))} height={h - 6} rx={3} fill={lane.muted ? 'var(--muted)' : (lane.color ?? 'var(--series-1)')} opacity={0.12} />
              ) : null,
            )}
            {/* bands */}
            {bandLayout.placed.map(({ ref: b, lane }) => {
              const x0 = x(b.start)
              const x1 = Math.max(x(b.end), x0 + 4)
              const y = bandsTop + lane * (BAND_H + LANE_GAP)
              const w = x1 - x0
              const color = b.color ?? 'var(--muted)'
              const fits = b.label.length * LABEL_PX + 10 <= w
              return (
                <g
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.label}, ${yearsLabel(b.start, b.end)}`}
                  style={{ cursor: onBand ? 'pointer' : 'default' }}
                  onClick={() => onBand?.(b)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onBand?.(b)}
                  onPointerMove={(e) =>
                    showTip(
                      e,
                      <>
                        <div className="v">{b.label}</div>
                        <div className="k">{yearsLabel(b.start, b.end)}</div>
                        {b.sub && <div className="k">{b.sub}</div>}
                      </>,
                    )
                  }
                  onPointerLeave={() => setTip(null)}
                >
                  <rect x={x0} y={y} width={w} height={BAND_H} rx={3} fill={color} opacity={b.emphasis ? 0.35 : 0.18} />
                  <rect x={x0} y={y} width={w} height={BAND_H} rx={3} fill="none" stroke={color} strokeWidth={b.emphasis ? 1.5 : 1} opacity={0.9} />
                  {fits && (
                    <text x={x0 + 5} y={y + BAND_H / 2 + 3.5} fontSize={10.5} fontWeight={b.emphasis ? 600 : 500} fill="var(--ink)">
                      {b.label}
                    </text>
                  )}
                </g>
              )
            })}
            {/* items: packed, or by lane */}
            {!lanes && itemLayout.placed.map(({ ref: it, lane }) => renderItem(it, itemsTop + lane * (ITEM_H + LANE_GAP) + ITEM_H / 2, itemLayout.overflow.has(it)))}
            {lanes && laneLayout.map(({ packed, top }) => packed.placed.map(({ ref: it, lane: sub }) => renderItem(it, itemsTop + top + LANE_PAD + sub * (ITEM_H + LANE_GAP) + ITEM_H / 2, packed.overflow.has(it))))}
            {/* mentions histogram */}
            {hist.bars.map((b) => {
              const h = Math.max(2, (b.count / hist.max) * (histH - 12))
              return (
                <g
                  key={b.year}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.count} ${binLabel} around ${formatYear(b.year)}`}
                  style={{ cursor: onBin ? 'pointer' : 'default' }}
                  onClick={() => onBin?.({ year: b.year, count: b.count, ordinals: b.ordinals })}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onBin?.({ year: b.year, count: b.count, ordinals: b.ordinals })}
                  onPointerMove={(e) =>
                    showTip(
                      e,
                      <>
                        <div className="v">
                          {b.count} {binLabel}
                        </div>
                        <div className="k">{b.span > 1 ? `${formatYear(b.year)} to ${formatYear(b.year + b.span - 1)}` : formatYear(b.year)}</div>
                        {onBin && <div className="k">click to read</div>}
                      </>,
                    )
                  }
                  onPointerLeave={() => setTip(null)}
                >
                  <rect x={b.x0} y={histTop} width={Math.max(2, b.x1 - b.x0)} height={histH} fill="transparent" />
                  <rect x={b.x0 + 0.5} y={histTop + histH - h} width={Math.max(1.5, b.x1 - b.x0 - 1)} height={h} rx={1} fill="var(--series-1)" opacity={0.75} />
                </g>
              )
            })}
            {histH > 0 && (
              <text x={GUTTER + 2} y={histTop + 10} fontSize={9.5} fill="var(--muted)" fontWeight={600}>
                {binLabel.toUpperCase()} BY YEAR
              </text>
            )}
          </g>
          {/* off-screen counts per lane */}
          {laneLayout.map(({ lane, top, beyondRight, beyondLeft }) => (
            <g key={`edge-${lane.id}`}>
              {beyondRight > 0 && (
                <text x={width - 4} y={itemsTop + top + 17} textAnchor="end" fontSize={10.5} fill="var(--accent)" style={{ cursor: 'pointer', paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3 }} onClick={reset}>
                  {beyondRight} later →
                </text>
              )}
              {beyondLeft > 0 && (
                <text x={GUTTER + 4} y={itemsTop + top + 17} fontSize={10.5} fill="var(--accent)" style={{ cursor: 'pointer', paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 3 }} onClick={reset}>
                  ← {beyondLeft} earlier
                </text>
              )}
            </g>
          ))}
          {/* axis */}
          <line x1={GUTTER} x2={width} y1={axisTop} y2={axisTop} stroke="var(--axis)" strokeWidth={1} />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${x(t)},${axisTop})`}>
              <line y1={0} y2={4} stroke="var(--axis)" />
              <text y={16} fontSize={10.5} textAnchor="middle" fill="var(--ink-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatYear(t)}
              </text>
            </g>
          ))}
        </svg>
      )}
      <VizTooltip tip={tip} />
    </div>
  )
}

function wrapLabel(text: string, maxChars: number, maxLines: number): string[] {
  if (maxLines <= 1) return [text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text]
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
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(1, maxChars - 1))}…`
    return kept
  }
  return lines
}
