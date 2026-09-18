import { useMemo, useState } from 'react'
import { RefLink } from './ui'
import type { Canon } from '@/lib/canon'
import { ordinalsToRanges } from '@/lib/refs'

/** Verses grouped by book, as reference chips. */
export default function VerseList({ ordinals, canon, color }: { ordinals: number[]; canon: Canon; color?: string }) {
  const groups = useMemo(() => {
    const byBook = new Map<number, number[]>()
    for (const o of ordinals) {
      const b = canon.locate(o).b
      ;(byBook.get(b) ?? byBook.set(b, []).get(b)!).push(o)
    }
    return [...byBook.entries()].sort((a, b) => a[0] - b[0]).map(([b, ords]) => ({ book: canon.book(b), ranges: ordinalsToRanges(ords), count: ords.length }))
  }, [ordinals, canon])
  const [open, setOpen] = useState<Set<number>>(() => new Set())
  const LIMIT = 24
  return (
    <div className="space-y-2">
      {groups.map(({ book, ranges, count }) => {
        const expanded = open.has(book.n)
        const shown = expanded ? ranges : ranges.slice(0, LIMIT)
        return (
          <div key={book.n} className="flex gap-3 items-baseline">
            <div className="w-28 shrink-0 text-sm">
              <span className="font-medium">{book.name}</span> <span className="text-muted text-xs">{count}</span>
            </div>
            <div className="flex flex-wrap gap-1 min-w-0">
              {shown.map((r) => (
                <RefLink key={r[0]} range={r} canon={canon} label={chipLabel(canon, r, book.chapters.length === 1)} color={color} />
              ))}
              {ranges.length > LIMIT && (
                <button type="button" className="chip chip-link text-accent" onClick={() => setOpen((s) => new Set(expanded ? [...s].filter((x) => x !== book.n) : [...s, book.n]))}>
                  {expanded ? 'fewer' : `+${ranges.length - LIMIT} more`}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function chipLabel(canon: Canon, r: [number, number], single: boolean): string {
  const a = canon.locate(r[0])
  const z = canon.locate(r[1])
  if (single) return a.v === z.v ? `${a.v}` : `${a.v}–${z.v}`
  if (r[0] === r[1]) return `${a.c}:${a.v}`
  if (a.c === z.c) return `${a.c}:${a.v}–${z.v}`
  return `${a.c}:${a.v}–${z.c}:${z.v}`
}
