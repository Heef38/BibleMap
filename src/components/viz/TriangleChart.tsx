import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import type { Bible, Study, StudyFacetValue, StudyGroup, StudyRef, StudyView } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { useWidth } from '@/lib/hooks'
import { truncate } from '@/lib/format'

interface Item {
  ref: StudyRef
  group: StudyGroup
}

/** Where a passage sits: on a corner's spoke, around the center, or on a side, drawn from one corner toward another. */
type Place = { kind: 'corner'; corner: string } | { kind: 'center'; together: boolean } | { kind: 'edge'; from: string; to: string }

interface Slot {
  key: string
  place: Place
  value: StudyFacetValue
  items: Item[]
}

type Focus = { kind: 'corner'; id: string } | { kind: 'center' } | { kind: 'edge'; key: string } | null

const cornerColor = (i: number) => `var(--series-${i + 1})`
const CENTER_INK = 'var(--ink-2)'

/**
 * The color a value of the triangle's facet has on the triangle, for other charts to match: a corner's
 * own color, a side's color is the person acting, the center is ink, all three together all three.
 */
export function triangleColor(study: Study, facetId: string, v: StudyFacetValue): string | undefined {
  const tri = study.triangle
  if (!tri || tri.facet !== facetId) return undefined
  const idx = (id?: string) => tri.corners.findIndex((c) => c.id === id)
  if (v.at === 'all') return `linear-gradient(90deg, ${cornerColor(0)} 0 33%, ${cornerColor(1)} 33% 67%, ${cornerColor(2)} 67%)`
  if (v.at === 'center') return CENTER_INK
  const i = idx(v.at ?? v.from)
  return i >= 0 ? cornerColor(i) : undefined
}
const keyOf = (r: StudyRef) => JSON.stringify(r.ranges)

type Pt = { x: number; y: number }
const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k })
/** The angle to turn text so it runs along a direction and still reads left to right. */
const upright = (d: Pt) => {
  const deg = (Math.atan2(d.y, d.x) * 180) / Math.PI
  return deg > 90 ? deg - 180 : deg < -90 ? deg + 180 : deg
}
const unit = (a: Pt, b: Pt): Pt => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l = Math.hypot(dx, dy) || 1
  return { x: dx / l, y: dy / l }
}

/**
 * The Trinity drawn the way the old Shield of the Trinity draws it: three corners, God at the center,
 * a spoke from each corner to the center for the passages that say that person is God, and on each
 * side two lines, one each way, for what one person does toward another. Passages where all three
 * act together ring the center. Hover anything to see it; click a passage to open it, or a corner,
 * a line or the center to list just those.
 */
export default function TriangleChart({
  study,
  view,
  canon,
  bible,
  selected,
  onRef,
}: {
  study: Study
  view: StudyView
  canon: Canon
  bible?: Bible
  selected: StudyRef | null
  onRef: (ref: StudyRef, group: StudyGroup) => void
}) {
  const tri = study.triangle!
  const facet = study.facets?.find((f) => f.id === tri.facet)
  const wrap = useRef<HTMLDivElement>(null)
  const width = useWidth(wrap)
  const [tip, setTip] = useState<TipState | null>(null)
  const [focus, setFocus] = useState<Focus>(null)
  const cornerIndex = useMemo(() => new Map(tri.corners.map((c, i) => [c.id, i])), [tri])
  const cornerTitle = (id: string) => tri.corners.find((c) => c.id === id)?.title ?? id

  // Every passage of this view once, filed under each place its tags put it.
  const slots = useMemo(() => {
    const seen = new Set<string>()
    const items: Item[] = []
    for (const g of view.groups)
      for (const r of g.refs) {
        if (seen.has(keyOf(r))) continue
        seen.add(keyOf(r))
        items.push({ ref: r, group: g })
      }
    const out: Slot[] = []
    for (const v of facet?.values ?? []) {
      const place: Place =
        v.at === 'center' || v.at === 'all' ? { kind: 'center', together: v.at === 'all' } : v.at ? { kind: 'corner', corner: v.at } : { kind: 'edge', from: v.from!, to: v.to! }
      out.push({ key: v.id, place, value: v, items: items.filter((it) => it.ref.facets?.[tri.facet]?.includes(v.id)) })
    }
    return out
  }, [view, facet, tri])

  const inFocus = (s: Slot): boolean => {
    if (!focus) return true
    if (focus.kind === 'edge') return s.key === focus.key
    if (focus.kind === 'center') return s.place.kind === 'center'
    const p = s.place
    return (p.kind === 'corner' && p.corner === focus.id) || (p.kind === 'edge' && (p.from === focus.id || p.to === focus.id)) || p.kind === 'center'
  }
  const toggle = (f: NonNullable<Focus>) => setFocus((cur) => (JSON.stringify(cur) === JSON.stringify(f) ? null : f))

  // Geometry: the shield points down, the first two corners across the top and the third below.
  const narrow = width < 480
  const R = Math.max(24, Math.min(40, width * 0.07))
  const rc = R * 0.95
  const dotR = narrow ? 3.6 : 4.5
  const padX = narrow ? 26 : 70
  const side = Math.max(160, Math.min(width - 2 * padX, 560))
  const top = R + 30
  const cx = width / 2
  const P: Pt[] = [
    { x: cx - side / 2, y: top },
    { x: cx + side / 2, y: top },
    { x: cx, y: top + (side * Math.sqrt(3)) / 2 },
  ]
  const C: Pt = { x: cx, y: (P[0].y + P[1].y + P[2].y) / 3 }
  const H = P[2].y + R + 34

  const tipFor = (e: PointerEvent, content: ReactNode) => setTip({ x: e.clientX, y: e.clientY, content })
  const hideTip = () => setTip(null)
  const fade = (on: boolean) => ({ opacity: on ? 1 : 0.14, transition: 'opacity 150ms ease' })

  const refTip = (it: Item, color: string) => (
    <>
      <div className="v flex items-center gap-1.5">
        <span className="swatch" style={{ background: color }} />
        {it.ref.label}
      </div>
      <div className="k">
        {it.ref.ranges.map(([s, e]) => canon.rangeLabel(s, e)).join('; ')}
        {' · '}
        {(it.ref.facets?.[tri.facet] ?? []).map((id) => facet?.values.find((v) => v.id === id)?.title ?? id).join(' · ')}
      </div>
      {it.ref.note && <div className="k mt-1">{truncate(it.ref.note, 150)}</div>}
      {bible && <div className="mt-1 font-serif">{truncate(bible.verses[it.ref.ranges[0][0]] ?? '', 150)}</div>}
      <div className="k mt-1">click to open it</div>
    </>
  )

  const dot = (it: Item, at: Pt, color: string, key: string, tri3 = false) => {
    const isSel = selected && keyOf(selected) === keyOf(it.ref)
    return (
      <g
        key={key}
        role="button"
        tabIndex={0}
        aria-label={`${it.ref.label} (${it.ref.ranges.map(([s, e]) => canon.rangeLabel(s, e)).join('; ')})`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation()
          hideTip()
          onRef(it.ref, it.group)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRef(it.ref, it.group)
          }
        }}
        onPointerMove={(e) => tipFor(e, refTip(it, color))}
        onPointerLeave={hideTip}
      >
        <circle cx={at.x} cy={at.y} r={dotR + 5} fill="transparent" />
        {tri3 ? (
          // All three together: a dot in the three colors.
          [0, 1, 2].map((i) => {
            const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / 3
            const a1 = a0 + (2 * Math.PI) / 3
            const r = dotR + 0.6
            return (
              <path
                key={i}
                d={`M${at.x},${at.y} L${at.x + r * Math.cos(a0)},${at.y + r * Math.sin(a0)} A${r},${r} 0 0 1 ${at.x + r * Math.cos(a1)},${at.y + r * Math.sin(a1)} Z`}
                fill={cornerColor(i)}
              />
            )
          })
        ) : (
          <circle cx={at.x} cy={at.y} r={dotR} fill={color} />
        )}
        <circle cx={at.x} cy={at.y} r={dotR + (isSel ? 2.5 : 0.8)} fill="none" stroke={isSel ? 'var(--ink)' : 'var(--surface)'} strokeWidth={isSel ? 2 : 1.2} />
      </g>
    )
  }

  /** Dots evenly along a segment, in two staggered rows when they would crowd. */
  const along = (a: Pt, b: Pt, n: number, away: Pt): Pt[] => {
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const d = unit(a, b)
    const crowded = n > 1 && len / n < dotR * 2 + 3
    const step = crowded ? len / Math.max(1, Math.ceil(n / 2)) : len / Math.max(1, n)
    return Array.from({ length: n }, (_, k) => {
      const i = crowded ? Math.floor(k / 2) : k
      const t = step * (i + 0.5)
      const shift = crowded && k % 2 ? dotR * 2 + 1 : 0
      return add(add(a, d, t), away, shift)
    })
  }

  const cornerSlots = (id: string) => slots.filter((s) => s.place.kind === 'corner' && s.place.corner === id)
  const centerSlots = slots.filter((s) => s.place.kind === 'center')
  const edgeSlots = slots.filter((s) => s.place.kind === 'edge' && s.items.length)
  const countFor = (id: string) => new Set(slots.filter((s) => (s.place.kind === 'corner' && s.place.corner === id) || (s.place.kind === 'edge' && (s.place.from === id || s.place.to === id))).flatMap((s) => s.items.map((it) => keyOf(it.ref)))).size

  const lineTip = (s: Slot) => (
    <>
      <div className="v">{s.value.title}</div>
      <div className="k">
        {s.items.length} passage{s.items.length === 1 ? '' : 's'}
      </div>
      {s.value.note && <div className="k mt-1">{s.value.note}</div>}
      <div className="k mt-1">click to list just these</div>
    </>
  )

  const focusTitle =
    focus?.kind === 'corner' ? cornerTitle(focus.id) : focus?.kind === 'center' ? tri.center.title : focus?.kind === 'edge' ? (slots.find((s) => s.key === focus.key)?.value.title ?? '') : ''
  const listSlots = focus ? slots.filter((s) => inFocus(s) && s.items.length) : []
  const slotColor = (s: Slot) => (s.place.kind === 'corner' ? cornerColor(cornerIndex.get(s.place.corner) ?? 0) : s.place.kind === 'edge' ? cornerColor(cornerIndex.get(s.place.from) ?? 0) : CENTER_INK)

  return (
    <div ref={wrap} className="w-full">
      <p className="text-[11px] text-muted mb-1.5">
        Hover anything to see it. Click a passage to open it; click a person, a line or the center to list just those. Each side has a line each way: the dots on it are what one person does toward the other.
      </p>
      {width > 0 && facet && (
        <svg width={width} height={H} className="block select-none rounded-xl border border-line bg-surface" role="img" aria-label={`${study.title} as a triangle`} onClick={() => setFocus(null)}>
          <defs>
            {tri.corners.map((_, i) => (
              <marker key={i} id={`tri-arrow-${i}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M1,1 L9,5 L1,9" fill="none" stroke={cornerColor(i)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            ))}
          </defs>

          {/* Spokes: each corner to the center, with the passages that say this person is God. */}
          {tri.corners.map((c, i) => {
            const a = add(P[i], unit(P[i], C), R + 4)
            const b = add(C, unit(C, P[i]), rc + 4)
            const on = !focus || (focus.kind === 'corner' && focus.id === c.id) || focus.kind === 'center'
            const list = cornerSlots(c.id)
            const inner = add(a, unit(a, b), 12)
            const outer = add(b, unit(b, a), 22)
            const mid = add(a, unit(a, b), Math.hypot(b.x - a.x, b.y - a.y) / 2)
            const perp = { x: -unit(a, b).y, y: unit(a, b).x }
            return (
              <g key={c.id} style={fade(on)}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cornerColor(i)} strokeWidth={1.25} strokeDasharray="3 4" opacity={0.7} />
                {!narrow && (
                  // Along the spoke, on the side away from a second row of dots, turned to read upright.
                  <text
                    x={mid.x - perp.x * (dotR + 9)}
                    y={mid.y - perp.y * (dotR + 9)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontStyle="italic"
                    fill="var(--muted)"
                    pointerEvents="none"
                    transform={`rotate(${upright(unit(a, b))} ${mid.x - perp.x * (dotR + 9)} ${mid.y - perp.y * (dotR + 9)})`}
                  >
                    is God
                  </text>
                )}
                {list.flatMap((s) => {
                  const pts = along(inner, outer, s.items.length, perp)
                  return s.items.map((it, k) => dot(it, pts[k], cornerColor(i), `${s.key}:${k}`))
                })}
              </g>
            )
          })}

          {/* Sides: a line each way between two persons. */}
          {tri.corners.map((ca, i) => {
            const j = (i + 1) % 3
            const cb = tri.corners[j]
            const outward = unit(C, add(P[i], unit(P[i], P[j]), Math.hypot(P[j].x - P[i].x, P[j].y - P[i].y) / 2))
            return [
              { from: ca.id, to: cb.id, a: P[i], b: P[j], fi: i, sign: 1 },
              { from: cb.id, to: ca.id, a: P[j], b: P[i], fi: j, sign: -1 },
            ].map(({ from, to, a, b, fi, sign }) => {
              const s = edgeSlots.find((x) => x.place.kind === 'edge' && x.place.from === from && x.place.to === to)
              const off = { x: outward.x * 8 * sign, y: outward.y * 8 * sign }
              const d = unit(a, b)
              const a1 = add(add(a, d, R + 6), off)
              const b1 = add(add(b, d, -(R + 6)), off)
              const on = !focus || (s && inFocus(s))
              const away = { x: off.x / 8, y: off.y / 8 }
              const pts = s ? along(add(a1, d, 10), add(b1, d, -16), s.items.length, away) : []
              const mid = add(a1, d, Math.hypot(b1.x - a1.x, b1.y - a1.y) * 0.5)
              return (
                <g key={`${from}>${to}`} style={fade(!!on)}>
                  <line x1={a1.x} y1={a1.y} x2={b1.x} y2={b1.y} stroke={cornerColor(fi)} strokeWidth={1.5} opacity={0.75} markerEnd={`url(#tri-arrow-${fi})`} />
                  {s && (
                    <line
                      x1={a1.x}
                      y1={a1.y}
                      x2={b1.x}
                      y2={b1.y}
                      stroke="transparent"
                      strokeWidth={9}
                      style={{ cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${s.value.title}: ${s.items.length} passages`}
                      onClick={(e) => {
                        e.stopPropagation()
                        hideTip()
                        toggle({ kind: 'edge', key: s.key })
                      }}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle({ kind: 'edge', key: s.key })}
                      onPointerMove={(e) => tipFor(e, lineTip(s))}
                      onPointerLeave={hideTip}
                    />
                  )}
                  {s?.items.map((it, k) => dot(it, pts[k], cornerColor(fi), `${s.key}:${k}`))}
                  {!narrow && s && sign === 1 && (
                    // Beyond the outer line, clear of a second row of dots when the line is crowded.
                    <text
                      x={mid.x + outward.x * (dotR * 2 + 20)}
                      y={mid.y + outward.y * (dotR * 2 + 20)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10.5}
                      fill="var(--muted)"
                      pointerEvents="none"
                      transform={`rotate(${upright(d)} ${mid.x + outward.x * (dotR * 2 + 20)} ${mid.y + outward.y * (dotR * 2 + 20)})`}
                    >
                      {ca.short ?? ca.title} and {cb.short ?? cb.title}
                    </text>
                  )}
                </g>
              )
            })
          })}

          {/* The center, ringed by the passages where they are one, and where all three act together. */}
          {(() => {
            const on = !focus || focus.kind === 'center' || focus.kind === 'corner'
            const ring = centerSlots.flatMap((s) => s.items.map((it) => ({ it, s })))
            const out: ReactNode[] = []
            let placed = 0
            let r = rc + 12
            while (placed < ring.length) {
              const cap = Math.max(6, Math.floor((2 * Math.PI * r) / (dotR * 2 + 3.5)))
              const n = Math.min(cap, ring.length - placed)
              for (let k = 0; k < n; k++) {
                const a = -Math.PI / 2 + (2 * Math.PI * k) / n
                const { it, s } = ring[placed + k]
                const together = s.place.kind === 'center' && s.place.together
                out.push(dot(it, { x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) }, CENTER_INK, `c:${s.key}:${placed + k}`, together))
              }
              placed += n
              r += dotR * 2 + 4
            }
            return (
              <g style={fade(on)}>
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={tri.center.title}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    hideTip()
                    toggle({ kind: 'center' })
                  }}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle({ kind: 'center' })}
                  onPointerMove={(e) =>
                    tipFor(
                      e,
                      <>
                        <div className="v">{tri.center.title}</div>
                        {tri.center.note && <div className="k">{tri.center.note}</div>}
                        {centerSlots.map((s) => (
                          <div key={s.key} className="k">
                            {s.value.title}: {s.items.length}
                          </div>
                        ))}
                        <div className="k mt-1">click to list just these</div>
                      </>,
                    )
                  }
                  onPointerLeave={hideTip}
                >
                  <circle cx={C.x} cy={C.y} r={rc} fill="var(--surface-2)" stroke="var(--ink-2)" strokeWidth={1.5} />
                  <text x={C.x} y={C.y + 4} textAnchor="middle" fontSize={narrow ? 11 : 13} fontWeight={600} fill="var(--ink)">
                    {tri.center.short ?? tri.center.title}
                  </text>
                </g>
                {out}
              </g>
            )
          })()}

          {/* Corners. */}
          {tri.corners.map((c, i) => {
            const on = !focus || (focus.kind === 'corner' && focus.id === c.id) || (focus.kind === 'edge' && edgeSlots.some((s) => s.key === focus.key && s.place.kind === 'edge' && (s.place.from === c.id || s.place.to === c.id)))
            const below = i === 2
            const n = countFor(c.id)
            return (
              <g
                key={c.id}
                style={{ ...fade(on || focus?.kind === 'center'), cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label={`${c.title}: ${n} passages`}
                onClick={(e) => {
                  e.stopPropagation()
                  hideTip()
                  toggle({ kind: 'corner', id: c.id })
                }}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle({ kind: 'corner', id: c.id })}
                onPointerMove={(e) =>
                  tipFor(
                    e,
                    <>
                      <div className="v">{c.title}</div>
                      {c.note && <div className="k">{c.note}</div>}
                      {slots
                        .filter((s) => s.items.length && ((s.place.kind === 'corner' && s.place.corner === c.id) || (s.place.kind === 'edge' && (s.place.from === c.id || s.place.to === c.id))))
                        .map((s) => (
                          <div key={s.key} className="k">
                            {s.value.title}: {s.items.length}
                          </div>
                        ))}
                      <div className="k mt-1">click to list everything about {c.short ?? c.title}</div>
                    </>,
                  )
                }
                onPointerLeave={hideTip}
              >
                <circle cx={P[i].x} cy={P[i].y} r={R} fill={`color-mix(in oklab, ${cornerColor(i)} 16%, var(--surface))`} stroke={cornerColor(i)} strokeWidth={2} />
                <text x={P[i].x} y={P[i].y + 4} textAnchor="middle" fontSize={narrow ? 10.5 : 12.5} fontWeight={600} fill="var(--ink)">
                  {c.short ?? c.title}
                </text>
                {/* The top corners' names run inward, so they stay on screen at any width. */}
                <text
                  x={below ? P[i].x : i === 0 ? Math.max(4, P[i].x - R) : Math.min(width - 4, P[i].x + R)}
                  y={below ? P[i].y + R + 16 : P[i].y - R - 9}
                  textAnchor={below ? 'middle' : i === 0 ? 'start' : 'end'}
                  fontSize={11}
                  fill="var(--muted)"
                >
                  {c.title} · {n}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      <VizTooltip tip={tip} />

      {/* Every place on the triangle as a chip: the same clicks as the chart, for touch and keyboards. */}
      <div className="flex flex-wrap gap-1.5 mt-3" role="group" aria-label="Show one relation">
        {slots
          .filter((s) => s.items.length)
          .map((s) => {
            const f: NonNullable<Focus> = s.place.kind === 'edge' ? { kind: 'edge', key: s.key } : s.place.kind === 'center' ? { kind: 'center' } : { kind: 'corner', id: s.place.corner }
            const on = focus !== null && JSON.stringify(focus) === JSON.stringify(f)
            return (
              <button key={s.key} type="button" className="chip chip-link" aria-pressed={on} style={on ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined} onClick={() => toggle(f)} title={s.value.note}>
                <span className="swatch" style={{ background: slotColor(s) }} />
                {s.value.title} <span className="text-muted">{s.items.length}</span>
              </button>
            )
          })}
      </div>

      {focus && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-base">{focusTitle}</h3>
            <span className="text-xs text-muted">{new Set(listSlots.flatMap((s) => s.items.map((it) => keyOf(it.ref)))).size} passages</span>
            <button type="button" className="btn btn-ghost ml-auto -mr-2 text-sm" onClick={() => setFocus(null)}>
              Show everything
            </button>
          </div>
          {listSlots.map((s) => (
            <div key={s.key} className="mt-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="swatch" style={{ background: slotColor(s) }} />
                {s.value.title}
                <span className="text-xs text-muted font-normal">{s.items.length}</span>
              </div>
              <ul className="mt-1">
                {s.items.map((it, k) => (
                  <li key={k}>
                    <button type="button" className="w-full text-left rounded-lg px-2 py-1 -mx-2 hover:bg-surface-2 text-sm" onClick={() => onRef(it.ref, it.group)}>
                      <span className="font-medium">{it.ref.label}</span> <span className="text-xs text-muted">{it.ref.ranges.map(([a, b]) => canon.rangeLabel(a, b, 'short')).join('; ')}</span>
                      {it.ref.note && <span className="block text-xs text-ink-2 leading-snug">{truncate(it.ref.note, 160)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
