import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import type { Canon, CanonBook } from '@/lib/canon'
import { countVerses, type Range } from '@/lib/refs'
import { useWidth } from '@/lib/hooks'
import { useSession } from '@/store/session'

export interface StripSeries {
  ranges: Range[]
  color: string
  label: string
}

interface Props {
  canon: Canon
  /** A single set of references (drawn in `color`). */
  ranges?: Range[]
  /** Several colored sets (a study's groups). */
  series?: StripSeries[]
  color?: string
  onChapter?: (b: number, c: number) => void
  caption?: string
}

const ROW_H = 18
const LABEL_H = 13
const ROW_GAP = 10
const LEFT = 26
const TICK_CAP = 4000

function layoutRow(books: CanonBook[], avail: number, gap = 2, min = 4): { x: number; w: number }[] {
  const total = books.reduce((s, b) => s + b.verseCount, 0)
  const inner = Math.max(0, avail - gap * (books.length - 1))
  let widths = books.map((b) => (b.verseCount / total) * inner)
  for (let iter = 0; iter < 4; iter++) {
    const fixed = widths.map((w) => w < min)
    const fixedSum = fixed.reduce((s, f) => s + (f ? min : 0), 0)
    const flexSum = widths.reduce((s, w, i) => s + (fixed[i] ? 0 : w), 0)
    const scale = flexSum > 0 ? (inner - fixedSum) / flexSum : 1
    widths = widths.map((w, i) => (fixed[i] ? min : w * scale))
  }
  let x = 0
  return widths.map((w) => {
    const r = { x, w }
    x += w + gap
    return r
  })
}

/** Verses per book for a set of ranges. */
function countByBook(canon: Canon, ranges: Range[]): number[] {
  const counts = new Array<number>(canon.books.length + 1).fill(0)
  for (const [s, e] of ranges) {
    const a = canon.locate(s).b
    const z = canon.locate(e).b
    if (a === z) {
      counts[a] += e - s + 1
      continue
    }
    counts[a] += canon.bookEnd(a) - s + 1
    for (let b = a + 1; b < z; b++) counts[b] += canon.book(b).verseCount
    counts[z] += e - canon.book(z).start + 1
  }
  return counts
}

function countByChapter(book: CanonBook, ranges: Range[]): number[] {
  const counts = book.chapters.map(() => 0)
  for (const [s, e] of ranges) {
    for (let c = 1; c <= book.chapters.length; c++) {
      const cs = book.chapterStarts[c - 1]
      const ce = cs + book.chapters[c - 1] - 1
      if (e < cs || s > ce) continue
      counts[c - 1] += Math.min(e, ce) - Math.max(s, cs) + 1
    }
  }
  return counts
}

const densityFill = (density: number, max: number) => {
  if (density <= 0) return 'var(--surface-2)'
  const pct = 25 + 75 * Math.sqrt(density / max)
  return `color-mix(in oklab, var(--seq-hi) ${pct.toFixed(0)}%, var(--seq-lo))`
}

export default function CanonStrip({ canon, ranges, series, color = 'var(--series-1)', onChapter, caption }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const goTo = useSession((s) => s.goTo)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)

  const allSeries: StripSeries[] = useMemo(() => {
    if (series) return series
    return [{ ranges: ranges ?? [], color, label: '' }]
  }, [series, ranges, color])
  const union = useMemo(() => allSeries.flatMap((s) => s.ranges), [allSeries])
  const total = useMemo(() => countVerses(union), [union])
  const counts = useMemo(() => countByBook(canon, union), [canon, union])
  const maxDensity = useMemo(() => Math.max(1e-9, ...canon.books.map((b) => counts[b.n] / b.verseCount)), [canon, counts])

  const rows: CanonBook[][] = useMemo(() => [canon.books.filter((b) => b.testament === 'OT'), canon.books.filter((b) => b.testament === 'NT')], [canon])
  const avail = Math.max(0, width - LEFT)
  const layouts = useMemo(() => rows.map((r) => layoutRow(r, avail)), [rows, avail])
  const rowY = (i: number) => i * (ROW_H + LABEL_H + ROW_GAP)
  const bookPos = new Map<number, { x: number; w: number; y: number }>()
  rows.forEach((r, ri) => r.forEach((b, i) => bookPos.set(b.n, { x: LEFT + layouts[ri][i].x, w: layouts[ri][i].w, y: rowY(ri) })))

  const expandedBook = expanded ? canon.book(expanded) : null
  const chapterCounts = useMemo(() => (expandedBook ? countByChapter(expandedBook, union) : []), [expandedBook, union])
  const chapterLayout = useMemo(() => {
    if (!expandedBook) return []
    const n = expandedBook.chapters.length
    const gap = 2
    const w = Math.max(3, (avail - gap * (n - 1)) / n)
    return Array.from({ length: n }, (_, i) => ({ x: LEFT + i * (w + gap), w }))
  }, [expandedBook, avail])
  const maxChapterDensity = expandedBook ? Math.max(1e-9, ...expandedBook.chapters.map((n, i) => chapterCounts[i] / n)) : 1

  const showTicks = total > 0 && total <= TICK_CAP
  const ticks = useMemo(() => {
    if (!showTicks) return []
    const out: { x: number; y: number; color: string }[] = []
    for (const s of allSeries) {
      for (const [a, z] of s.ranges) {
        for (let o = a; o <= z; o++) {
          const b = canon.locate(o).b
          const pos = bookPos.get(b)
          if (!pos) continue
          const book = canon.book(b)
          out.push({ x: pos.x + ((o - book.start + 0.5) / book.verseCount) * pos.w, y: pos.y, color: s.color })
        }
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSeries, showTicks, canon, width])

  const chapterTicks = useMemo(() => {
    if (!showTicks || !expandedBook) return []
    const out: { x: number; color: string }[] = []
    for (const s of allSeries) {
      for (const [a, z] of s.ranges) {
        const from = Math.max(a, expandedBook.start)
        const to = Math.min(z, canon.bookEnd(expandedBook.n))
        for (let o = from; o <= to; o++) {
          const { c, v } = canon.locate(o)
          const cell = chapterLayout[c - 1]
          if (!cell) continue
          out.push({ x: cell.x + ((v - 0.5) / expandedBook.chapters[c - 1]) * cell.w, color: s.color })
        }
      }
    }
    return out
  }, [allSeries, showTicks, expandedBook, chapterLayout, canon])

  const height = rowY(2) - ROW_GAP + (expandedBook ? ROW_H + LABEL_H + ROW_GAP + 14 : 0)
  const expandedY = rowY(2) + 8

  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })

  return (
    <div ref={wrapRef} className="w-full">
      {caption && <div className="text-xs text-ink-2 mb-1.5">{caption}</div>}
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Where these references fall across the Bible" className="block select-none">
          {rows.map((r, ri) => (
            <g key={ri}>
              <text x={0} y={rowY(ri) + ROW_H / 2 + 4} fontSize={11} fontWeight={600} fill="var(--muted)">
                {ri === 0 ? 'OT' : 'NT'}
              </text>
              {r.map((b) => {
                const pos = bookPos.get(b.n)!
                const n = counts[b.n]
                const active = expanded === b.n
                return (
                  <g
                    key={b.n}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.name}: ${n} of ${b.verseCount} verses`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(active ? null : b.n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpanded(active ? null : b.n)
                      }
                    }}
                    onPointerMove={(e) =>
                      showTip(
                        e,
                        <>
                          <div className="v">{b.name}</div>
                          <div className="k">
                            {n.toLocaleString()} of {b.verseCount.toLocaleString()} verses{n ? ` · ${((100 * n) / b.verseCount).toFixed(n / b.verseCount < 0.1 ? 1 : 0)}%` : ''}
                          </div>
                        </>,
                      )
                    }
                    onPointerLeave={() => setTip(null)}
                  >
                    <rect x={pos.x} y={pos.y} width={pos.w} height={ROW_H} rx={2} fill={densityFill(n / b.verseCount, maxDensity)} stroke={active ? 'var(--ink)' : 'none'} strokeWidth={1.5} />
                    {pos.w >= 26 && (
                      <text x={pos.x + pos.w / 2} y={pos.y + ROW_H + 10} fontSize={9.5} textAnchor="middle" fill="var(--ink-2)">
                        {b.short}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}
          {ticks.map((t, i) => (
            <line key={i} x1={t.x} x2={t.x} y1={t.y + 2} y2={t.y + ROW_H - 2} stroke={t.color} strokeWidth={1} opacity={0.9} pointerEvents="none" />
          ))}
          {expandedBook && (
            <g>
              <text x={0} y={expandedY + ROW_H / 2 + 4} fontSize={10} fontWeight={600} fill="var(--muted)">
                {expandedBook.short.length <= 4 ? expandedBook.short : expandedBook.short.slice(0, 4)}
              </text>
              {expandedBook.chapters.map((verses, i) => {
                const cell = chapterLayout[i]
                const n = chapterCounts[i]
                const c = i + 1
                const every = cell.w >= 18 ? 1 : cell.w >= 9 ? 5 : 10
                return (
                  <g
                    key={c}
                    role="button"
                    tabIndex={0}
                    aria-label={`${expandedBook.name} ${c}: ${n} of ${verses} verses`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => (onChapter ? onChapter(expandedBook.n, c) : goTo(canon.chapterStart(expandedBook.n, c), { focus: false }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onChapter ? onChapter(expandedBook.n, c) : goTo(canon.chapterStart(expandedBook.n, c), { focus: false })
                      }
                    }}
                    onPointerMove={(e) =>
                      showTip(
                        e,
                        <>
                          <div className="v">
                            {expandedBook.name} {c}
                          </div>
                          <div className="k">
                            {n} of {verses} verses · click to read
                          </div>
                        </>,
                      )
                    }
                    onPointerLeave={() => setTip(null)}
                  >
                    <rect x={cell.x} y={expandedY} width={cell.w} height={ROW_H} rx={2} fill={densityFill(n / verses, maxChapterDensity)} />
                    {(c === 1 || c % every === 0) && cell.w >= 6 && (
                      <text x={cell.x + cell.w / 2} y={expandedY + ROW_H + 10} fontSize={9} textAnchor="middle" fill="var(--ink-2)">
                        {c}
                      </text>
                    )}
                  </g>
                )
              })}
              {chapterTicks.map((t, i) => (
                <line key={i} x1={t.x} x2={t.x} y1={expandedY + 2} y2={expandedY + ROW_H - 2} stroke={t.color} strokeWidth={1} opacity={0.9} pointerEvents="none" />
              ))}
            </g>
          )}
        </svg>
      )}
      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-10 h-2 rounded-sm" style={{ background: 'linear-gradient(90deg, var(--seq-lo), var(--seq-hi))' }} />
          share of the book
        </span>
        {showTicks && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-px h-3" style={{ background: allSeries[0]?.color }} />
            each verse
          </span>
        )}
        <span className="ml-auto">{expandedBook ? `${expandedBook.name} by chapter · click a chapter to read` : 'click a book to see its chapters'}</span>
      </div>
      <VizTooltip tip={tip} />
    </div>
  )
}
