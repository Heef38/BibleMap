import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { layoutRow } from './CanonStrip'
import { VizTooltip, type TipState } from './Tooltip'
import { groupColor } from './Sunburst'
import type { Bible, Study, StudyRef, StudyView } from '@/data/types'
import type { Canon, CanonBook } from '@/lib/canon'
import type { Range } from '@/lib/refs'
import { useWidth } from '@/lib/hooks'
import { truncate } from '@/lib/format'

/** Category colors: the first three categorical slots validate for any-pair adjacency. */
export function categoryColor(categories: { id: string }[] | undefined, id: string | undefined): string {
  const i = categories?.findIndex((c) => c.id === id) ?? -1
  return i >= 0 && i < 8 ? `var(--series-${i + 1})` : 'var(--muted)'
}

export interface ArcTarget {
  ranges: Range[]
  label: string
  category?: string
  note?: string
  topic?: string
}
export interface ArcPair {
  ref: StudyRef
  target: ArcTarget
}
interface Link {
  ref: StudyRef
  target: ArcTarget
  groupId: string
  groupTitle: string
  x1: number
  x2: number
  row1: number
  row2: number
}

const ROW_H = 16
const LABEL_H = 14
const LEFT = 26
const ARC_H = 190

export default function ArcDiagram({
  study,
  view,
  canon,
  bible,
  selectedGroup,
  hiddenCategories,
  selected,
  onSelect,
}: {
  study: Study
  view: StudyView
  canon: Canon
  bible?: Bible
  selectedGroup: string | null
  hiddenCategories: Set<string>
  selected: ArcPair | null
  onSelect: (pair: ArcPair | null) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const rows: CanonBook[][] = useMemo(() => [canon.books.filter((b) => b.testament === 'OT'), canon.books.filter((b) => b.testament === 'NT')], [canon])
  const avail = Math.max(0, width - LEFT)
  const layouts = useMemo(() => rows.map((r) => layoutRow(r, avail)), [rows, avail])
  const pos = useMemo(() => {
    const m = new Map<number, { x: number; w: number; row: number }>()
    rows.forEach((r, ri) => r.forEach((b, i) => m.set(b.n, { x: LEFT + layouts[ri][i].x, w: layouts[ri][i].w, row: ri })))
    return m
  }, [rows, layouts])
  const xOf = (o: number) => {
    const b = canon.locate(o).b
    const p = pos.get(b)!
    const book = canon.book(b)
    return { x: p.x + ((o - book.start + 0.5) / book.verseCount) * p.w, row: p.row }
  }

  const topY = 0
  const bottomY = ROW_H + LABEL_H + ARC_H
  const height = bottomY + ROW_H + LABEL_H + 4

  const links: Link[] = useMemo(() => {
    if (width <= 0) return []
    const out: Link[] = []
    for (const g of view.groups)
      for (const r of g.refs) {
        const targets: ArcTarget[] = r.links?.length ? r.links.map((l) => ({ ranges: l.ranges, label: l.label, category: l.category ?? r.category, note: l.note, topic: l.topic })) : r.to?.length ? [{ ranges: r.to, label: r.toLabel ?? '', category: r.category }] : []
        for (const t of targets) {
          const a = xOf(r.ranges[0][0])
          const b = xOf(t.ranges[0][0])
          out.push({ ref: r, target: t, groupId: g.id, groupTitle: g.title, x1: a.x, x2: b.x, row1: a.row, row2: b.row })
        }
      }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, width, pos])

  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })
  const keyOf = (l: Link) => `${l.groupId}:${l.ref.label}:${l.target.label}:${l.target.topic ?? ''}`
  const selectedKey = selected ? links.find((l) => l.ref === selected.ref && l.target.label === selected.target.label && l.target.topic === selected.target.topic) : null

  const visible = (l: Link) => !(l.target.category && hiddenCategories.has(l.target.category))
  const active = (l: Link) => !selectedGroup || l.groupId === selectedGroup
  const groupIndex = (id: string) => view.groups.findIndex((g) => g.id === id)
  /** Arcs are colored by kind; a selected group's arcs take the group's own color so they match its chip. */
  const colorOf = (l: Link) => (selectedGroup && l.groupId === selectedGroup ? groupColor(groupIndex(l.groupId)) : categoryColor(study.categories, l.target.category))

  return (
    <div ref={wrapRef} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${study.title}: ${links.length} connections between passages`} className="block select-none">
          {/* arcs */}
          <g>
            {links.filter(visible).map((l) => {
              const k = keyOf(l)
              const isHover = hover === k
              const isSel = selectedKey ? keyOf(selectedKey) === k : false
              const on = active(l)
              const edgeY = (row: number) => (row === 0 ? topY + ROW_H : bottomY)
              const y1 = edgeY(l.row1)
              const y2 = edgeY(l.row2)
              let d: string
              if (l.row1 === l.row2) {
                // both passages in the same Testament: bow into the middle band
                const bow = l.row1 === 0 ? ARC_H * 0.5 : -ARC_H * 0.5
                d = `M${l.x1},${y1} C${l.x1},${y1 + bow} ${l.x2},${y2 + bow} ${l.x2},${y2}`
              } else {
                const cy1 = l.row1 === 0 ? y1 + ARC_H * 0.55 : y1 - ARC_H * 0.55
                const cy2 = l.row2 === 0 ? y2 + ARC_H * 0.55 : y2 - ARC_H * 0.55
                d = `M${l.x1},${y1} C${l.x1},${cy1} ${l.x2},${cy2} ${l.x2},${y2}`
              }
              const color = colorOf(l)
              const emphasized = isHover || isSel
              return (
                <g key={k}>
                  <path d={d} fill="none" stroke={color} strokeWidth={emphasized ? 2.5 : 1.5} opacity={emphasized ? 1 : on ? 0.55 : 0.1} strokeLinecap="round" style={{ transition: 'opacity 150ms' }} pointerEvents="none" />
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={10}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${l.ref.label} to ${l.target.label}${l.target.category ? `, ${l.target.category}` : ''}`}
                    onClick={() => onSelect(isSel ? null : { ref: l.ref, target: l.target })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(isSel ? null : { ref: l.ref, target: l.target })}
                    onPointerMove={(e) => {
                      setHover(k)
                      showTip(
                        e,
                        <>
                          <div className="v">
                            {l.ref.label} → {l.target.label}
                          </div>
                          <div className="k">
                            {[study.categories?.find((c) => c.id === l.target.category)?.title ?? l.target.category, l.target.topic, l.groupTitle].filter(Boolean).join(' · ')}
                            {l.target.ranges && l.ref.jesusOwn ? ' · words of Jesus' : l.ref.jesus ? ' · connected by Jesus' : ''}
                          </div>
                          {(l.target.note ?? l.ref.note) && <div className="k mt-1">{l.target.note ?? l.ref.note}</div>}
                          {bible && <div className="mt-1 font-serif">{truncate(bible.verses[l.ref.ranges[0][0]], 120)}</div>}
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
            })}
          </g>
          {/* rows */}
          {rows.map((r, ri) => {
            const y = ri === 0 ? topY : bottomY
            return (
              <g key={ri}>
                <text x={0} y={y + ROW_H / 2 + 4} fontSize={11} fontWeight={600} fill="var(--muted)">
                  {ri === 0 ? 'OT' : 'NT'}
                </text>
                {r.map((b) => {
                  const p = pos.get(b.n)!
                  return (
                    <g key={b.n}>
                      <rect x={p.x} y={y} width={p.w} height={ROW_H} rx={2} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={0.5} />
                      {p.w >= 26 && (
                        <text x={p.x + p.w / 2} y={ri === 0 ? y - 4 : y + ROW_H + 11} fontSize={9.5} textAnchor="middle" fill="var(--ink-2)">
                          {b.short}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}
          {/* endpoints */}
          {links.filter(visible).map((l) => {
            const k = keyOf(l)
            const on = active(l)
            const color = colorOf(l)
            const yOf = (row: number) => (row === 0 ? topY + ROW_H / 2 : bottomY + ROW_H / 2)
            return (
              <g key={`e-${k}`} pointerEvents="none" opacity={on ? 1 : 0.15}>
                <circle cx={l.x1} cy={yOf(l.row1)} r={2.2} fill={color} />
                <circle cx={l.x2} cy={yOf(l.row2)} r={2.2} fill={color} />
              </g>
            )
          })}
        </svg>
      )}
      <VizTooltip tip={tip} />
    </div>
  )
}
