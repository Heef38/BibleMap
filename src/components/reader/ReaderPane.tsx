import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { IconChevronLeft, IconChevronRight } from '@/components/common/icons'
import { Loading } from '@/components/common/ui'
import VerseConnections from './VerseConnections'
import { useData } from '@/data/useData'
import { loadBible, loadBibleIndex, loadCanon } from '@/data/loaders'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

function VerseText({ text, spans }: { text: string; spans?: [number, number][] }) {
  if (!spans?.length) return <>{text}</>
  const parts: ReactNode[] = []
  let i = 0
  for (const [a, b] of spans) {
    if (a > i) parts.push(text.slice(i, a))
    parts.push(
      <span className="wj" key={a}>
        {text.slice(a, b)}
      </span>,
    )
    i = b
  }
  if (i < text.length) parts.push(text.slice(i))
  return <>{parts}</>
}

export default function ReaderPane() {
  const translation = useSettings((s) => s.translation)
  const redLetter = useSettings((s) => s.redLetter)
  const showHeadings = useSettings((s) => s.showHeadings)
  const showNumbers = useSettings((s) => s.showNumbers)
  const set = useSettings((s) => s.set)
  const { data: canon } = useData('canon', loadCanon)
  const { data: bibles } = useData('bibles', loadBibleIndex)
  const { data: bible, error } = useData(`bible:${translation}`, () => loadBible(translation))
  const readerOrdinal = useSession((s) => s.readerOrdinal)
  const focus = useSession((s) => s.focus)
  const highlights = useSession((s) => s.highlights)
  const goTo = useSession((s) => s.goTo)
  const setFocus = useSession((s) => s.setFocus)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loc = canon ? canon.locate(readerOrdinal) : null
  const book = canon && loc ? canon.book(loc.b) : null
  const start = canon && loc ? canon.chapterStart(loc.b, loc.c) : 0
  const end = canon && loc ? canon.chapterEnd(loc.b, loc.c) : -1

  const hlMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const h of highlights) {
      for (const [s, e] of h.ranges) {
        const a = Math.max(s, start)
        const z = Math.min(e, end)
        for (let o = a; o <= z; o++) m.set(o, h.color ?? 'var(--accent)')
      }
    }
    return m
  }, [highlights, start, end])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !bible) return
    if (focus !== null && focus >= start && focus <= end) {
      const v = el.querySelector<HTMLElement>(`[data-o="${focus}"]`)
      if (v) {
        const top = v.offsetTop - el.clientHeight * 0.3
        el.scrollTo({ top: Math.max(0, top) })
      }
    } else {
      el.scrollTop = 0
    }
  }, [focus, start, end, bible])

  if (error) return <div className="p-4 text-sm text-ink-2">Could not load this translation: {error.message}</div>
  if (!canon || !loc || !book) return <Loading />

  const chapterCount = book.chapters.length
  const prev = start > 0 ? start - 1 : null
  const next = end + 1 < canon.total ? end + 1 : null
  const ordinals: number[] = []
  for (let o = start; o <= end; o++) ordinals.push(o)
  const otBooks = canon.books.filter((b) => b.testament === 'OT')
  const ntBooks = canon.books.filter((b) => b.testament === 'NT')
  const showWj = redLetter && !!bible?.wj

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line shrink-0 flex-wrap">
        <select className="field !w-auto !py-1 !px-2 text-sm" value={translation} onChange={(e) => set({ translation: e.target.value })} aria-label="Translation">
          {(bibles ?? [{ id: translation, abbrev: translation.toUpperCase(), name: '', redLetter: false, headings: false }]).map((b) => (
            <option key={b.id} value={b.id}>
              {b.abbrev}
            </option>
          ))}
        </select>
        <select className="field !w-auto !py-1 !px-2 text-sm min-w-0 max-w-[10rem]" value={loc.b} onChange={(e) => goTo(canon.chapterStart(+e.target.value, 1), { focus: false, pane: false })} aria-label="Book">
          <optgroup label="Old Testament">
            {otBooks.map((b) => (
              <option key={b.n} value={b.n}>
                {b.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="New Testament">
            {ntBooks.map((b) => (
              <option key={b.n} value={b.n}>
                {b.name}
              </option>
            ))}
          </optgroup>
        </select>
        <select className="field !w-auto !py-1 !px-2 text-sm" value={loc.c} onChange={(e) => goTo(canon.chapterStart(loc.b, +e.target.value), { focus: false, pane: false })} aria-label="Chapter">
          {Array.from({ length: chapterCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-1">
          <button type="button" className="btn btn-ghost" disabled={prev === null} onClick={() => prev !== null && goTo(prev, { focus: false, pane: false, history: 'replace' })} title="Previous chapter">
            <IconChevronLeft />
          </button>
          <button type="button" className="btn btn-ghost" disabled={next === null} onClick={() => next !== null && goTo(next, { focus: false, pane: false, history: 'replace' })} title="Next chapter">
            <IconChevronRight />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {!bible ? (
          <Loading label={`Loading ${translation.toUpperCase()}…`} />
        ) : (
          <div className="scripture">
            <div className="kicker mb-3">
              {book.name} {chapterCount > 1 ? loc.c : ''}
            </div>
            {ordinals.map((o) => {
              const text = bible.verses[o]
              const heading = showHeadings && bible.headings?.[o]
              const v = o - start + 1
              const hl = hlMap.get(o)
              const isFocus = focus === o
              return (
                <div key={o}>
                  {heading && <div className="heading">{heading}</div>}
                  <span
                    data-o={o}
                    className={`verse${hl ? ' hl' : ''}${isFocus ? ' focus' : ''}`}
                    style={hl ? ({ '--hl-color': hl } as React.CSSProperties) : undefined}
                    onClick={() => setFocus(isFocus ? null : o)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setFocus(isFocus ? null : o)
                      }
                    }}
                    aria-label={`${canon.label(o)}`}
                  >
                    {showNumbers && <span className="vnum">{v}</span>}
                    {text ? <VerseText text={text} spans={showWj ? bible.wj?.[o] : undefined} /> : <span className="omitted">[not in this translation]</span>}
                  </span>
                </div>
              )
            })}
            <div className="flex justify-between mt-8 font-sans text-sm">
              {prev !== null ? (
                <button type="button" className="btn btn-ghost" onClick={() => goTo(prev, { focus: false, pane: false, history: 'replace' })}>
                  <IconChevronLeft /> {canon.rangeLabel(canon.chapterStart(canon.locate(prev).b, canon.locate(prev).c), prev, 'short')}
                </button>
              ) : (
                <span />
              )}
              {next !== null && (
                <button type="button" className="btn btn-ghost" onClick={() => goTo(next, { focus: false, pane: false, history: 'replace' })}>
                  {canon.rangeLabel(next, canon.chapterEnd(canon.locate(next).b, canon.locate(next).c), 'short')} <IconChevronRight />
                </button>
              )}
            </div>
            <div className="mt-6 text-[11px] font-sans text-muted leading-relaxed">{bible.attribution}</div>
          </div>
        )}
      </div>

      {focus !== null && focus >= start && focus <= end && bible && <VerseConnections ordinal={focus} canon={canon} bible={bible} onClose={() => setFocus(null)} />}
    </div>
  )
}
