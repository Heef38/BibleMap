import * as d3 from 'd3'
import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { VizTooltip, type TipState } from '@/components/viz/Tooltip'
import BookChord, { groupSeries, type XrefMatrix } from '@/components/viz/BookChord'
import { Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { fetchJson, loadBooks, loadCanon } from '@/data/loaders'
import type { SurahInfo } from '@/data/types'
import type { CanonBook } from '@/lib/canon'
import { useWidth } from '@/lib/hooks'
import { usePageTitle } from '@/store/session'
import { MECCAN_SURAHS, nth } from './config'

/** What each seventh of the text holds, for a reader finding their way. */
const SEVENTHS_BLURB: string[] = [
  'The opening prayer, then the longest surahs, from Medina: the community’s law and its argument with the Jews and Christians beside it.',
  'The last long Medinan surahs, on covenant, war and the final break with idolatry, around two long Meccan ones (6 and 7) on God’s oneness and the fate of earlier peoples.',
  'Meccan surahs named for prophets and signs: Jonah, Hud, Joseph, Abraham. The stories of the messengers and what became of those who refused them.',
  'From the Night Journey to the Criterion: the Cave, Mary, Moses, the prophets one after another, then Medinan teaching on the pilgrimage and on the household.',
  'Moses and Pharaoh told at length, Solomon and the queen of Sheba, then consolation and warning for a community under pressure, and the clans at the Trench.',
  'Surahs of argument with Mecca’s unbelief, the seven that open with Ha-Mim, then Medinan surahs on fighting, the treaty and the manners of the community.',
  'A run of Medinan surahs (57–66) on spending, the hypocrites, divorce and the Prophet’s household; then the short surahs, most of them the earliest: oaths, the Last Day, heaven and hell, in rhymed bursts that shorten to a few lines at the end.',
]

interface TNode {
  name: string
  book?: CanonBook
  value?: number
  children?: TNode[]
}
type Order = 'book' | 'revelation' | 'noldeke'

const fillFor = (group: string, hovered: boolean) => (hovered ? groupSeries(group) : `color-mix(in oklab, ${groupSeries(group)} 68%, var(--surface))`)

/** How the Quran is laid out: its surahs by size, the order they stand in against the order they came in, and how they echo one another. */
export default function QuranPage() {
  usePageTitle('How the Quran is laid out', { description: 'The 114 surahs of the Quran drawn to the length of their text, in the order of the book and in the order of revelation, with how their wording echoes across the text.' })
  const { data: canon } = useData('canon', loadCanon)
  const { data: books } = useData('books', loadBooks)
  const { data: matrix } = useData('xref-matrix', () => fetchJson<XrefMatrix>('xrefs/matrix.json'))
  const wrapRef = useRef<HTMLDivElement>(null)
  const width = useWidth(wrapRef)
  const navigate = useNavigate()
  const [tip, setTip] = useState<TipState | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [order, setOrder] = useState<Order>('book')
  const height = Math.max(320, Math.min(520, Math.round(width * 0.5)))

  const info = useMemo(() => new Map<number, SurahInfo>((books?.books ?? []).flatMap((b) => (b.surah ? [[b.n, b.surah] as [number, SurahInfo]] : []))), [books])

  const root = useMemo(() => {
    if (!canon || width <= 0) return null
    const divisions = [...new Set(canon.books.map((b) => b.division))]
    const h = d3
      .hierarchy<TNode>({ name: 'Quran', children: divisions.map((d) => ({ name: d, children: canon.books.filter((b) => b.division === d).map((b) => ({ name: b.name, book: b, value: b.verseCount })) })) })
      .sum((d) => d.value ?? 0)
    d3.treemap<TNode>().size([width, height]).paddingOuter(3).paddingTop(18).paddingInner(1.5).tile(d3.treemapSquarify.ratio(1.4))(h)
    return h as d3.HierarchyRectangularNode<TNode>
  }, [canon, width, height])

  const ordered = useMemo(() => {
    if (!canon) return []
    const key = (b: CanonBook) => (order === 'book' ? b.n : order === 'revelation' ? (info.get(b.n)?.order ?? b.n) : (info.get(b.n)?.noldeke ?? b.n))
    return [...canon.books].sort((a, b) => key(a) - key(b))
  }, [canon, info, order])

  if (!canon || !books) return <div className="p-6"><Loading /></div>
  const total = canon.total
  const sum = (bs: CanonBook[], f: (b: CanonBook) => number) => bs.reduce((s, b) => s + f(b), 0)
  const showTip = (e: PointerEvent, content: TipState['content']) => setTip({ x: e.clientX, y: e.clientY, content })
  const tipFor = (b: CanonBook) => {
    const s = info.get(b.n)
    return (
      <>
        <div className="v">
          {b.n}. {b.name}
        </div>
        {s && <div className="k">“{s.meaning}”</div>}
        <div className="k">
          {b.verseCount.toLocaleString()} verses · {((100 * b.verseCount) / total).toFixed(1)}% of the Quran
        </div>
        {s && (
          <div className="k">
            {s.place}, {nth(s.order)} in the traditional order · Nöldeke: {s.period}
          </div>
        )}
        <div className="k">click to open the surah</div>
      </>
    )
  }

  const BAR_H = 150
  const maxVerses = Math.max(...canon.books.map((b) => b.verseCount))
  const bw = width > 0 ? width / ordered.length : 0
  // Where Medina begins, when the bars stand in an order of revelation.
  const split = order === 'revelation' ? MECCAN_SURAHS : order === 'noldeke' ? ordered.findIndex((b) => info.get(b.n)?.period === 'Medinan') : -1

  return (
    <div className="p-6">
      <PageHeader
        kicker="Orientation"
        title="How the Quran is laid out"
        subtitle="One hundred and fourteen surahs, 6,236 verses. After a short opening prayer the surahs stand roughly from the longest to the shortest, which is close to the reverse of the order in which tradition says they came."
      />
      <div className="grid gap-3 sm:grid-cols-2 mb-4 text-sm">
        {(['Meccan', 'Medinan'] as const).map((place) => {
          const list = canon.books.filter((b) => b.group === place)
          return (
            <div key={place} className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex items-baseline gap-3">
                <span className="swatch" style={{ background: fillFor(place, false) }} />
                <span className="font-medium">{place === 'Meccan' ? 'Revealed at Mecca' : 'Revealed at Medina'}</span>
                <span className="text-ink-2 ml-auto tabular-nums">
                  {list.length} surahs · {sum(list, (b) => b.verseCount).toLocaleString()} verses
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-1.5 leading-snug">
                {place === 'Meccan'
                  ? 'About 610 to 622, while Muhammad preached in his own city to few followers: one God, the Last Day, the prophets before him, and what became of the peoples who refused them.'
                  : 'From 622 to 632, after the move to Medina, where he led a community: law for worship, family and trade, fighting and treaties, and the dispute with Jews, Christians and those called hypocrites.'}
              </p>
            </div>
          )
        })}
      </div>

      <div ref={wrapRef} className="w-full">
        {root && (
          <svg width={width} height={height} className="block select-none" role="img" aria-label="The 114 surahs of the Quran as blocks sized by length, in seven parts, colored by where each was revealed">
            {root.descendants().map((n, i) => {
              if (n.depth === 1)
                return (
                  <text key={i} x={n.x0 + 4} y={n.y0 + 13} fontSize={10.5} fontWeight={600} fill="var(--ink-2)">
                    {n.x1 - n.x0 > 86 ? n.data.name : n.data.name.replace('Surahs ', '')}
                  </text>
                )
              if (n.depth === 2 && n.data.book) {
                const b = n.data.book
                const w = n.x1 - n.x0
                const h = n.y1 - n.y0
                const hovered = hover === b.n
                return (
                  <g
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.n}. ${b.name}: ${b.verseCount} verses, ${b.group}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/book/${b.osis}`)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/book/${b.osis}`)}
                    onPointerMove={(e) => {
                      setHover(b.n)
                      showTip(e, tipFor(b))
                    }}
                    onPointerLeave={() => {
                      setHover(null)
                      setTip(null)
                    }}
                  >
                    <rect x={n.x0} y={n.y0} width={Math.max(0, w)} height={Math.max(0, h)} rx={2.5} fill={fillFor(b.group, hovered)} stroke="var(--surface)" strokeWidth={1} />
                    {w >= 22 && h >= 13 && (
                      <text x={n.x0 + w / 2} y={n.y0 + h / 2 + 3.5} textAnchor="middle" fontSize={w >= 60 && h >= 24 ? 11 : 9.5} fill="var(--ink)" pointerEvents="none" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 2.5, strokeLinejoin: 'round' }}>
                        {w >= b.name.length * 6.5 + 6 && h >= 16 ? b.name : b.n}
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
      <p className="text-xs text-muted mt-1">Each block is a surah, drawn to the number of its verses, in the seven portions the text is read in over a week. Hover one for its size and place; click it to open the surah.</p>

      <Section title="Two orders">
        <p className="text-sm text-ink-2 max-w-prose mb-3">
          The book does not tell a story from beginning to end, and it is not arranged by date. Stand the surahs in the order of the book and they fall away in length; stand them in the order tradition says they were revealed and the short, early surahs of Mecca come first and the long ones of Medina last.
        </p>
        <div className="seg mb-2" role="group" aria-label="Order of the surahs">
          <button type="button" aria-pressed={order === 'book'} onClick={() => setOrder('book')}>
            As they stand in the book
          </button>
          <button type="button" aria-pressed={order === 'revelation'} onClick={() => setOrder('revelation')}>
            As tradition says they came
          </button>
          <button type="button" aria-pressed={order === 'noldeke'} onClick={() => setOrder('noldeke')}>
            In Nöldeke’s order
          </button>
        </div>
        {width > 0 && (
          <svg width={width} height={BAR_H + 22} className="block select-none" role="img" aria-label="The length of each surah, in the chosen order">
            {ordered.map((b, i) => {
              const h = Math.max(2, (b.verseCount / maxVerses) * BAR_H)
              return (
                <g
                  key={b.n}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.n}. ${b.name}: ${b.verseCount} verses`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/book/${b.osis}`)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/book/${b.osis}`)}
                  onPointerMove={(e) => {
                    setHover(b.n)
                    showTip(e, tipFor(b))
                  }}
                  onPointerLeave={() => {
                    setHover(null)
                    setTip(null)
                  }}
                >
                  <rect x={i * bw} y={0} width={bw} height={BAR_H} fill="transparent" />
                  <rect x={i * bw + 0.5} y={BAR_H - h} width={Math.max(1, bw - 1)} height={h} rx={1} fill={fillFor(b.group, hover === b.n)} />
                </g>
              )
            })}
            <line x1={0} x2={width} y1={BAR_H + 0.5} y2={BAR_H + 0.5} stroke="var(--axis)" />
            {split > 0 && (
              <g>
                <line x1={split * bw} x2={split * bw} y1={0} y2={BAR_H + 6} stroke="var(--ink-2)" strokeDasharray="3 3" />
                <text x={split * bw - 6} y={BAR_H + 16} textAnchor="end" fontSize={10.5} fill="var(--ink-2)">
                  Mecca
                </text>
                <text x={split * bw + 6} y={BAR_H + 16} fontSize={10.5} fill="var(--ink-2)">
                  Medina, from 622
                </text>
              </g>
            )}
            {split <= 0 && (
              <>
                <text x={0} y={BAR_H + 16} fontSize={10.5} fill="var(--ink-2)">
                  Surah 1
                </text>
                <text x={width} y={BAR_H + 16} textAnchor="end" fontSize={10.5} fill="var(--ink-2)">
                  Surah 114
                </text>
              </>
            )}
          </svg>
        )}
        <p className="text-xs text-muted mt-1 max-w-prose">
          Each bar is a surah, as tall as it has verses; the color is where tradition says it was revealed. The traditional order is the one printed in the standard Egyptian edition. Theodor Nöldeke’s (1860) is the order most used by Western scholars: he split the Meccan surahs into three periods by style, and placed a few surahs at Mecca that tradition places at Medina. Both orders place whole surahs, though many hold verses from more than one time.
        </p>
      </Section>

      <Section title="How the surahs echo one another">
        <p className="text-sm text-ink-2 max-w-prose mb-3">
          The Quran returns to the same words again and again. Every ribbon is a bundle of related verses from one part of the text to another: pairs of verses that share much of their wording in Arabic. The links are computed from the words, not taken from a commentary.
        </p>
        {matrix ? <BookChord canon={canon} matrix={matrix} divisionsLabel="The seven parts" legend={(g) => `from a ${g.name} surah`} /> : <Loading />}
      </Section>

      <Section title="The seven parts">
        <p className="text-sm text-ink-2 max-w-prose mb-4">
          For reading the whole in a week, the text is divided into seven portions (each a <i>manzil</i>), which always end with a surah. This site uses them as its parts of the Quran. The text is also cut into thirty equal parts (each a <i>juz</i>) for reading in a month, which pay no regard to where a surah ends.
        </p>
        <div className="space-y-5">
          {[...new Set(canon.books.map((b) => b.division))].map((d, i) => {
            const list = canon.books.filter((b) => b.division === d)
            const verses = sum(list, (b) => b.verseCount)
            return (
              <div key={d} className="grid gap-x-6 gap-y-1 md:grid-cols-[13rem_1fr]">
                <div>
                  <div className="font-medium">{d}</div>
                  <div className="text-xs text-muted tabular-nums mt-0.5">
                    {list.length} surahs · {verses.toLocaleString()} verses · {((100 * verses) / total).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <p className="text-sm text-ink-2 leading-snug">{SEVENTHS_BLURB[i]}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {list.map((b) => (
                      <Link key={b.n} to={`/book/${b.osis}`} className="chip chip-link">
                        <span className="swatch" style={{ background: fillFor(b.group, false) }} />
                        {b.n}. {b.name}
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
