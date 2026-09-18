import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import type { Bible, Study, StudyGroup, StudyRef, StudyView } from '@/data/types'
import { useWidth } from '@/lib/hooks'
import { truncate } from '@/lib/format'
import { useSession } from '@/store/session'

export const groupColor = (i: number) => (i < 8 ? `var(--series-${i + 1})` : 'var(--muted)')
export const refFill = (gi: number, jesus: boolean) => `color-mix(in oklab, ${groupColor(gi)} ${jesus ? 100 : 58}%, var(--surface))`

interface Datum {
  kind: 'root' | 'group' | 'ref'
  name: string
  value?: number
  gi?: number
  group?: StudyGroup
  ref?: StudyRef
  children?: Datum[]
}
type RNode = d3.HierarchyRectangularNode<Datum>

interface AnimState {
  d0: number
  d1: number
  z: number
}

const TAU = Math.PI * 2

export default function Sunburst({
  study,
  view,
  bible,
  selected,
  onSelect,
}: {
  study: Study
  view: StudyView
  bible?: Bible
  selected: string | null
  onSelect: (groupId: string | null) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const size = Math.max(300, Math.min(width || 300, 640))
  const R = size / 2 - 6
  const r0 = R * 0.3
  const rMid = R * 0.63
  const GAP = 3
  const goTo = useSession((s) => s.goTo)
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const root = useMemo(() => {
    const data: Datum = {
      kind: 'root',
      name: study.title,
      children: view.groups.map((g, gi) => ({
        kind: 'group',
        name: g.title,
        gi,
        group: g,
        children: g.refs.map((r) => ({ kind: 'ref', name: r.label, gi, group: g, ref: r, value: r.weight })),
      })),
    }
    const h = d3.hierarchy(data).sum((d) => d.value ?? 0)
    return d3.partition<Datum>().size([TAU, 3])(h)
  }, [study, view])

  const focusNode = useMemo(() => (selected ? (root.children?.find((n) => n.data.group?.id === selected) ?? root) : root), [root, selected])
  const target: AnimState = { d0: focusNode.x0, d1: focusNode.x1, z: focusNode === root ? 0 : 1 }
  const [anim, setAnim] = useState<AnimState>(target)
  const animRef = useRef(anim)
  animRef.current = anim

  useEffect(() => {
    const from = animRef.current
    if (from.d0 === target.d0 && from.d1 === target.d1 && from.z === target.z) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnim(target)
      return
    }
    const t0 = performance.now()
    const dur = 480
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const e = d3.easeCubicInOut(t)
      setAnim({ d0: from.d0 + (target.d0 - from.d0) * e, d1: from.d1 + (target.d1 - from.d1) * e, z: from.z + (target.z - from.z) * e })
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.d0, target.d1, target.z])

  const span = Math.max(1e-6, anim.d1 - anim.d0)
  const ang = (x: number) => Math.max(0, Math.min(TAU, ((x - anim.d0) / span) * TAU))
  const ringGroup: [number, number] = [r0, rMid + (r0 - rMid) * anim.z]
  const ringRef: [number, number] = [rMid + GAP + (r0 - rMid - GAP) * anim.z, R]
  const arcGen = d3.arc<{ a0: number; a1: number; ri: number; ro: number }>()
    .startAngle((d) => d.a0)
    .endAngle((d) => d.a1)
    .innerRadius((d) => d.ri)
    .outerRadius((d) => d.ro)
    .padAngle((d) => Math.min(0.012, 2 / Math.max(1, d.ro)))
    .padRadius(R)
    .cornerRadius(2)

  const nodes = root.descendants().filter((n) => n.depth > 0)
  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })

  const tipFor = (n: RNode) => {
    if (n.data.kind === 'group' && n.data.group) {
      const g = n.data.group
      return (
        <>
          <div className="v">{g.title}</div>
          <div className="k">
            {g.refs.length} references · {g.verses.toLocaleString()} verses · weight {g.weight}
          </div>
          {g.note && <div className="k mt-1">{truncate(g.note, 160)}</div>}
        </>
      )
    }
    if (n.data.kind === 'ref' && n.data.ref) {
      const r = n.data.ref
      const first = bible?.verses[r.ranges[0][0]]
      return (
        <>
          <div className="v">{r.label}</div>
          <div className="k">
            {n.data.group?.title} · weight {r.weight}
            {r.jesus ? ' · words of Jesus' : ''}
          </div>
          {r.note && <div className="k mt-1">{r.note}</div>}
          {first && <div className="mt-1 font-serif">{truncate(first, 140)}</div>}
        </>
      )
    }
    return null
  }

  const focusTitle = focusNode === root ? study.title : (focusNode.data.group?.title ?? '')
  const focusVerses = focusNode === root ? study.verseCount : (focusNode.data.group?.verses ?? 0)
  const focusRefs = focusNode === root ? study.refCount : (focusNode.data.group?.refs.length ?? 0)
  const centerLines = wrap(focusTitle, Math.max(10, Math.floor((r0 * 1.7) / 7)))

  return (
    <div ref={wrapRef} className="w-full flex justify-center">
      {width > 0 && (
        <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label={`${study.title}: references grouped ${view.title.toLowerCase()}, sized by weight`} className="block select-none">
          {nodes.map((n) => {
            const a0 = ang(n.x0)
            const a1 = ang(n.x1)
            if (a1 - a0 < 0.0015) return null
            const isGroup = n.data.kind === 'group'
            if (isGroup && n === focusNode) return null
            const [ri, ro] = isGroup ? ringGroup : ringRef
            if (ro - ri < 1) return null
            const gi = n.data.gi ?? 0
            const fill = isGroup ? groupColor(gi) : refFill(gi, !!n.data.ref?.jesus)
            const id = isGroup ? `g:${n.data.group?.id}` : `r:${n.data.group?.id}:${n.data.ref?.label}`
            const hovered = hover === id
            const d = arcGen({ a0, a1, ri, ro }) ?? ''
            const mid = (a0 + a1) / 2
            const rm = (ri + ro) / 2
            const arcLen = (a1 - a0) * rm
            const thickness = ro - ri
            const label = isGroup ? n.data.name : (n.data.ref?.label ?? '')
            const canLabel = arcLen >= 13 && thickness >= 40
            const maxChars = Math.floor((thickness - 10) / 6.2)
            const rot = (mid * 180) / Math.PI - 90
            const flip = mid > Math.PI
            return (
              <g key={id}>
                <path
                  d={d}
                  fill={fill}
                  stroke={hovered ? 'var(--ink)' : 'var(--surface)'}
                  strokeWidth={hovered ? 1.5 : 1}
                  style={{ cursor: 'pointer', transition: 'stroke 120ms' }}
                  role="button"
                  tabIndex={0}
                  aria-label={isGroup ? `${label}: ${n.data.group?.refs.length} references` : `${label}${n.data.ref?.jesus ? ', words of Jesus' : ''}`}
                  onClick={() => {
                    if (isGroup) onSelect(n.data.group!.id)
                    else if (n.data.ref) goTo(n.data.ref.ranges[0][0])
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (isGroup) onSelect(n.data.group!.id)
                      else if (n.data.ref) goTo(n.data.ref.ranges[0][0])
                    }
                  }}
                  onPointerMove={(e) => {
                    setHover(id)
                    showTip(e, tipFor(n))
                  }}
                  onPointerLeave={() => {
                    setHover(null)
                    setTip(null)
                  }}
                />
                {canLabel && (
                  <text
                    transform={`rotate(${rot}) translate(${ri + 6},0) ${flip ? `rotate(180) translate(${-(thickness - 12)},0)` : ''}`}
                    fontSize={isGroup ? 11 : 10}
                    fontWeight={isGroup ? 600 : 400}
                    fill={isGroup ? '#ffffff' : 'var(--ink)'}
                    dominantBaseline="middle"
                    pointerEvents="none"
                    style={{ paintOrder: 'stroke', stroke: isGroup ? 'rgba(0,0,0,0.45)' : 'var(--surface)', strokeWidth: isGroup ? 2.5 : 2.5, strokeLinejoin: 'round' }}
                  >
                    {truncate(label, maxChars)}
                  </text>
                )}
              </g>
            )
          })}
          <g
            role="button"
            tabIndex={0}
            aria-label={focusNode === root ? 'All groups' : 'Back to all groups'}
            style={{ cursor: focusNode === root ? 'default' : 'pointer' }}
            onClick={() => onSelect(null)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(null)}
          >
            <circle r={r0 - 4} fill="var(--surface)" />
            {centerLines.map((line, i) => (
              <text key={i} y={(i - (centerLines.length - 1) / 2) * 15 - 6} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--ink)">
                {line}
              </text>
            ))}
            <text y={((centerLines.length - 1) / 2) * 15 + 12} textAnchor="middle" fontSize={10.5} fill="var(--ink-2)">
              {focusRefs} refs · {focusVerses.toLocaleString()} verses
            </text>
            {focusNode !== root && (
              <text y={((centerLines.length - 1) / 2) * 15 + 27} textAnchor="middle" fontSize={10} fill="var(--accent)">
                ← all groups
              </text>
            )}
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
  return lines.slice(0, 3)
}
