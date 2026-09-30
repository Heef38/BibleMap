import * as d3 from 'd3'
import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { VizTooltip, type TipState } from './Tooltip'
import type { Canon } from '@/lib/canon'
import { useWidth } from '@/lib/hooks'
import { EDITION } from '@edition/config'

export interface XrefMatrix {
  books: string[]
  counts: number[][]
}

type Mode = 'division' | 'book'

/** The color of a book's group: the first group (the Old Testament) blue, the second orange. */
export const groupSeries = (group: string) => `var(--series-${EDITION.groups.findIndex((g) => g.id === group) === 0 ? 1 : 2})`
const tone = (color: string, strong = false) => (strong ? color : `color-mix(in oklab, ${color} 70%, var(--surface))`)

/** A chord diagram of which parts of the scripture point to which, from the cross-reference data. */
export default function BookChord({
  canon,
  matrix,
  divisionsLabel = 'Kinds of writing',
  legend = (g) => `from the ${g.name}`,
}: {
  canon: Canon
  matrix: XrefMatrix
  /** what the divisions of this scripture are called, on the switch */
  divisionsLabel?: string
  legend?: (group: { id: string; name: string }) => string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const [mode, setMode] = useState<Mode>('division')
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const groups = useMemo(() => {
    if (mode === 'book') return canon.books.map((b) => ({ id: b.osis, label: b.short, full: b.name, color: groupSeries(b.group), members: [b.n - 1] }))
    const order = [...new Set(canon.books.map((b) => b.division))]
    const parts = order.map((d) => canon.books.filter((b) => b.division === d))
    // A division inside one group (the Bible's Law, Gospels ...) takes that group's color. Where
    // divisions mix the groups (the Quran's seven parts hold Meccan and Medinan surahs), each gets its own.
    const pure = parts.every((members) => members.every((b) => b.group === members[0].group))
    return parts.map((members, i) => ({
      id: order[i],
      label: order[i],
      full: order[i],
      color: pure ? groupSeries(members[0].group) : `var(--series-${((i + 2) % 8) + 1})`,
      members: members.map((b) => b.n - 1),
    }))
  }, [canon, mode])
  const byGroup = mode === 'book' || groups.every((g) => EDITION.groups.some((e) => groupSeries(e.id) === g.color))

  const m = useMemo(() => {
    const n = groups.length
    const out: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    groups.forEach((g, i) =>
      groups.forEach((h, j) => {
        let s = 0
        for (const a of g.members) for (const b of h.members) if (a !== b) s += matrix.counts[a][b]
        out[i][j] = s
      }),
    )
    return out
  }, [groups, matrix])

  const size = Math.max(320, Math.min(width, 640))
  const outerR = size / 2 - (mode === 'book' ? 46 : 100)
  const innerR = outerR - 12
  const chords = useMemo(() => d3.chord().padAngle(mode === 'book' ? 0.015 : 0.04).sortSubgroups(d3.descending)(m), [m, mode])
  const arc = d3.arc<d3.ChordGroup>().innerRadius(innerR).outerRadius(outerR)
  const ribbon = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerR)
  const total = m.flat().reduce((s, x) => s + x, 0)
  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })

  const topPairs = useMemo(() => {
    const pairs: { i: number; j: number; v: number }[] = []
    for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) if (i !== j && m[i][j] > 0) pairs.push({ i, j, v: m[i][j] })
    return pairs.sort((a, b) => b.v - a.v).slice(0, 8)
  }, [m])

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="seg" role="group" aria-label="Group by">
          <button type="button" aria-pressed={mode === 'division'} onClick={() => setMode('division')}>
            {divisionsLabel}
          </button>
          <button type="button" aria-pressed={mode === 'book'} onClick={() => setMode('book')}>
            {EDITION.words.books.replace(/^./, (c) => c.toUpperCase())}
          </button>
        </div>
        <span className="text-xs text-muted">{total.toLocaleString()} {EDITION.words.xrefs} between different {EDITION.words.books}. Hover a group to see its links.</span>
      </div>
      <div className="@container">
        <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_260px] items-start">
          {width > 0 && (
            <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="block select-none mx-auto" role="img" aria-label={`Chord diagram of ${EDITION.words.xrefs} between the parts of ${EDITION.words.scripture}`}>
              <g>
                {chords.map((c, k) => {
                  const on = hover === null || c.source.index === hover || c.target.index === hover
                  const src = groups[c.source.index]
                  const dst = groups[c.target.index]
                  return (
                    <path
                      key={k}
                      d={ribbon(c) ?? ''}
                      fill={src.color}
                      opacity={on ? (hover === null ? 0.35 : 0.75) : 0.05}
                      stroke="var(--surface)"
                      strokeWidth={0.5}
                      style={{ transition: 'opacity 150ms' }}
                      onPointerMove={(e) =>
                        showTip(
                          e,
                          <>
                            <div className="v">
                              {src.full} → {dst.full}
                            </div>
                            <div className="k">
                              {c.source.value.toLocaleString()} references{c.source.index !== c.target.index ? ` · ${c.target.value.toLocaleString()} back` : ''}
                            </div>
                          </>,
                        )
                      }
                      onPointerLeave={() => setTip(null)}
                    />
                  )
                })}
              </g>
              <g>
                {chords.groups.map((g) => {
                  const grp = groups[g.index]
                  const mid = (g.startAngle + g.endAngle) / 2
                  const deg = (mid * 180) / Math.PI - 90
                  const flip = mid > Math.PI
                  const out = m[g.index].reduce((s, x) => s + x, 0)
                  const inc = m.reduce((s, row) => s + row[g.index], 0)
                  return (
                    <g
                      key={g.index}
                      role="button"
                      tabIndex={0}
                      aria-label={`${grp.full}: ${out.toLocaleString()} references out, ${inc.toLocaleString()} in`}
                      onPointerMove={(e) => {
                        setHover(g.index)
                        showTip(
                          e,
                          <>
                            <div className="v">{grp.full}</div>
                            <div className="k">
                              points out {out.toLocaleString()} times · pointed to {inc.toLocaleString()} times
                            </div>
                          </>,
                        )
                      }}
                      onPointerLeave={() => {
                        setHover(null)
                        setTip(null)
                      }}
                      onFocus={() => setHover(g.index)}
                      onBlur={() => setHover(null)}
                    >
                      <path d={arc(g) ?? ''} fill={tone(grp.color, hover === g.index)} stroke="var(--surface)" strokeWidth={1} />
                      <text
                        transform={`rotate(${deg}) translate(${outerR + 6},0) ${flip ? 'rotate(180)' : ''}`}
                        textAnchor={flip ? 'end' : 'start'}
                        dominantBaseline="middle"
                        fontSize={mode === 'book' ? 8.5 : 11}
                        fontWeight={hover === g.index ? 700 : 500}
                        fill="var(--ink)"
                      >
                        {grp.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
          <div className="text-sm">
            <div className="kicker mb-2">Strongest links</div>
            <ol className="divide-y divide-line">
              {topPairs.map((p) => (
                <li key={`${p.i}-${p.j}`} className="py-1.5 flex items-baseline gap-2">
                  <span className="swatch" style={{ background: groups[p.i].color }} />
                  <span className="min-w-0 truncate">
                    {groups[p.i].full} <span className="text-muted">→</span> {groups[p.j].full}
                  </span>
                  <span className="ml-auto tabular-nums text-ink-2">{p.v.toLocaleString()}</span>
                </li>
              ))}
            </ol>
            {byGroup && (
              <div className="flex items-center gap-3 mt-3 text-xs text-ink-2">
                {EDITION.groups.map((g) => (
                  <span key={g.id} className="flex items-center gap-1.5">
                    <span className="swatch" style={{ background: groupSeries(g.id) }} /> {legend(g)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <VizTooltip tip={tip} />
    </div>
  )
}
