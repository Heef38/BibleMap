import type { ReactNode } from 'react'
import { parseVerseQuery, termRegex } from '@/data/search'

/** Wrap every query term in <mark>. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const { terms } = parseVerseQuery(query)
  if (!terms.length) return <>{text}</>
  const re = new RegExp(terms.map((t) => termRegex(t).source).join('|'), 'gi')
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    out.push(
      <mark key={k++} className="bg-transparent text-inherit font-semibold underline decoration-2 decoration-[var(--series-2)] underline-offset-2">
        {m[0]}
      </mark>,
    )
    last = i + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
