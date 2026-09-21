import * as d3 from 'd3'
import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { VizTooltip, type TipState } from '@/components/viz/Tooltip'
import BookChord, { type XrefMatrix } from '@/components/viz/BookChord'
import { fetchJson } from '@/data/loaders'
import { Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon } from '@/data/loaders'
import type { CanonBook } from '@/lib/canon'
import { useWidth } from '@/lib/hooks'
import { usePageTitle } from '@/store/session'

interface DivisionInfo {
  id: string
  blurb: string
}

const DIVISIONS: DivisionInfo[] = [
  { id: 'Law', blurb: 'Genesis to Deuteronomy, the five books of Moses: creation, the patriarchs, the exodus and the covenant at Sinai. Everything after builds on them.' },
  { id: 'History', blurb: 'Joshua to Esther: Israel in the land, through conquest, judges and kings, into exile and back.' },
  { id: 'Poetry & Wisdom', blurb: 'Job to the Song of Solomon: prayers, songs and hard-won wisdom for living before God.' },
  { id: 'Major Prophets', blurb: 'Isaiah to Daniel, the long prophetic books: judgment, exile, and the promised King.' },
  { id: 'Minor Prophets', blurb: 'Hosea to Malachi, twelve shorter prophets. "Minor" is about length, not importance.' },
  { id: 'Gospels', blurb: 'Matthew, Mark, Luke and John: four accounts of the life, death and resurrection of Jesus.' },
  { id: 'Acts', blurb: 'The Spirit and the church, from Jerusalem to Rome.' },
  { id: 'Pauline Epistles', blurb: "Romans to Philemon: Paul's letters to churches and to his co-workers." },
  { id: 'General Epistles', blurb: 'Hebrews to Jude: letters to the wider church from other apostles and leaders.' },
  { id: 'Revelation', blurb: "John's vision of Christ's victory and the new creation." },
]

interface TNode {
  name: string
  book?: CanonBook
  value?: number
  children?: TNode[]
}

const fillFor = (t: 'OT' | 'NT', hovered: boolean) => (hovered ? `var(--series-${t === 'OT' ? 1 : 2})` : `color-mix(in oklab, var(--series-${t === 'OT' ? 1 : 2}) 68%, var(--surface))`)

export default function BiblePage() {
  usePageTitle('How the Bible is laid out')
  const { data: canon } = useData('canon', loadCanon)
  const { data: matrix } = useData('xref-matrix', () => fetchJson<XrefMatrix>('xrefs/matrix.json'))
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const navigate = useNavigate()
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const height = Math.max(320, Math.min(520, Math.round(width * 0.5)))

  const root = useMemo(() => {
    if (!canon || width <= 0) return null
    const byTestament = (t: 'OT' | 'NT'): TNode => {
      const books = canon.books.filter((b) => b.testament === t)
      const divisions = [...new Set(books.map((b) => b.division))]
      return {
        name: t === 'OT' ? 'Old Testament' : 'New Testament',
        children: divisions.map((d) => ({ name: d, children: books.filter((b) => b.division === d).map((b) => ({ name: b.name, book: b, value: b.verseCount })) })),
      }
    }
    const h = d3.hierarchy<TNode>({ name: 'Bible', children: [byTestament('OT'), byTestament('NT')] }).sum((d) => d.value ?? 0)
    d3
      .treemap<TNode>()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(20)
      .paddingInner(2)
      .tile(d3.treemapSquarify.ratio(1.4))(h)
    return h as d3.HierarchyRectangularNode<TNode>
  }, [canon, width, height])

  if (!canon) return <div className="p-6"><Loading /></div>
  const total = canon.total
  const ot = canon.books.filter((b) => b.testament === 'OT')
  const nt = canon.books.filter((b) => b.testament === 'NT')
  const sum = (bs: CanonBook[], f: (b: CanonBook) => number) => bs.reduce((s, b) => s + f(b), 0)
  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })

  return (
    <div className="p-6">
      <PageHeader
        kicker="Orientation"
        title="How the Bible is laid out"
        subtitle="Sixty-six books in two Testaments, gathered into ten kinds of writing. Each block below is a book, drawn to the length of its text."
      />
      <div className="grid gap-3 sm:grid-cols-2 mb-4 text-sm">
        {[
          ['Old Testament', ot],
          ['New Testament', nt],
        ].map(([name, books]) => (
          <div key={name as string} className="rounded-xl border border-line bg-surface px-4 py-3 flex items-baseline gap-3">
            <span className="swatch" style={{ background: fillFor(name === 'Old Testament' ? 'OT' : 'NT', false) }} />
            <span className="font-medium">{name as string}</span>
            <span className="text-ink-2 ml-auto tabular-nums">
              {(books as CanonBook[]).length} books · {sum(books as CanonBook[], (b) => b.chapters.length).toLocaleString()} chapters · {sum(books as CanonBook[], (b) => b.verseCount).toLocaleString()} verses
            </span>
          </div>
        ))}
      </div>
      <div ref={wrapRef} className="w-full">
        {root && (
          <svg width={width} height={height} className="block select-none" role="img" aria-label="The 66 books of the Bible as blocks sized by length, grouped by kind of writing">
            {root.descendants().map((n, i) => {
              if (n.depth === 1)
                return (
                  <text key={i} x={n.x0 + 4} y={n.y0 + 14} fontSize={11.5} fontWeight={700} fill="var(--ink)">
                    {n.data.name}
                  </text>
                )
              if (n.depth === 2)
                return (
                  <g key={i}>
                    <rect x={n.x0} y={n.y0} width={Math.max(0, n.x1 - n.x0)} height={Math.max(0, n.y1 - n.y0)} fill="var(--surface-2)" rx={4} />
                    {n.x1 - n.x0 > 60 && (
                      <text x={n.x0 + 4} y={n.y0 + 13} fontSize={10} fontWeight={600} fill="var(--ink-2)">
                        {n.x1 - n.x0 > n.data.name.length * 6 + 8 ? n.data.name : n.data.name.split(' ')[0]}
                      </text>
                    )}
                  </g>
                )
              if (n.depth === 3 && n.data.book) {
                const b = n.data.book
                const w = n.x1 - n.x0
                const h = n.y1 - n.y0
                const hovered = hover === b.n
                return (
                  <g
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.name}: ${b.chapters.length} chapters, ${b.verseCount} verses`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/book/${b.osis}`)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/book/${b.osis}`)}
                    onPointerMove={(e) => {
                      setHover(b.n)
                      showTip(
                        e,
                        <>
                          <div className="v">{b.name}</div>
                          <div className="k">
                            {b.division} · {b.chapters.length} chapter{b.chapters.length === 1 ? '' : 's'} · {b.verseCount.toLocaleString()} verses · {((100 * b.verseCount) / total).toFixed(1)}% of the Bible
                          </div>
                          <div className="k">click to open the book</div>
                        </>,
                      )
                    }}
                    onPointerLeave={() => {
                      setHover(null)
                      setTip(null)
                    }}
                  >
                    <rect x={n.x0} y={n.y0} width={Math.max(0, w)} height={Math.max(0, h)} rx={3} fill={fillFor(b.testament, hovered)} stroke="var(--surface)" strokeWidth={1} />
                    {w >= 28 && h >= 14 && (
                      <text x={n.x0 + w / 2} y={n.y0 + h / 2 + 3.5} textAnchor="middle" fontSize={w >= 60 && h >= 24 ? 11 : 9.5} fill="var(--ink)" pointerEvents="none" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 2.5, strokeLinejoin: 'round' }}>
                        {w >= b.name.length * 6.5 + 6 ? b.name : b.short}
                      </text>
                    )}
                  </g>
                )
              }
              return null
            })}
          </svg>
        )}
      </div>
      <p className="text-xs text-muted mt-1">Hover a block for its size; click it to open the book with its chapters and outline.</p>

      <Section title="How the books talk to each other">
        <p className="text-sm text-ink-2 max-w-prose mb-3">
          Every ribbon is a bundle of cross references from one part of the Bible to another, built from the 344,799 links readers have voted on at OpenBible.info. The Old Testament feeds the New, and the Psalms and the Prophets feed almost everything.
        </p>
        {matrix ? <BookChord canon={canon} matrix={matrix} /> : <Loading />}
      </Section>

      <Section title="The ten kinds of writing">
        <div className="space-y-5">
          {DIVISIONS.map((d) => {
            const books = canon.books.filter((b) => b.division === d.id)
            if (!books.length) return null
            const verses = sum(books, (b) => b.verseCount)
            return (
              <div key={d.id} className="grid gap-x-6 gap-y-1 md:grid-cols-[13rem_1fr]">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span className="swatch" style={{ background: fillFor(books[0].testament, false) }} />
                    {d.id}
                  </div>
                  <div className="text-xs text-muted tabular-nums mt-0.5">
                    {books.length} book{books.length === 1 ? '' : 's'} · {sum(books, (b) => b.chapters.length)} chapters · {verses.toLocaleString()} verses · {((100 * verses) / total).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <p className="text-sm text-ink-2 leading-snug">{d.blurb}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {books.map((b) => (
                      <Link key={b.n} to={`/book/${b.osis}`} className="chip chip-link">
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
      <VizTooltip tip={tip} />
    </div>
  )
}
