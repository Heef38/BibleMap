import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useSession } from '@/store/session'
import type { Range } from '@/lib/refs'
import { parseRefs } from '@/lib/refs'
import type { Canon } from '@/lib/canon'
import type { NameMeaning } from '@/data/types'

export function PageHeader({ kicker, title, subtitle, right }: { kicker?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3 mb-5">
      <div className="min-w-[18rem] flex-1">
        {kicker && <div className="kicker mb-1">{kicker}</div>}
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="text-ink-2 mt-1">{subtitle}</div>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

export function Section({ title, count, children, actions }: { title: string; count?: number; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="kicker">{title}</h2>
        {count !== undefined && <span className="text-xs text-muted">{count.toLocaleString()}</span>}
        <div className="ml-auto">{actions}</div>
      </div>
      {children}
    </section>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="text-muted text-sm py-6" role="status">
      {label}
    </div>
  )
}

export function ErrorBlock({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm">
      <div className="font-medium">Something did not load.</div>
      <div className="text-ink-2 mt-1">{error.message}</div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-muted text-sm py-4">{children}</div>
}

/** A reference chip: click to read it. */
export function RefLink({ range, canon, label, className = 'chip chip-link', color }: { range: Range; canon: Canon; label?: string; className?: string; color?: string }) {
  const goTo = useSession((s) => s.goTo)
  const text = label ?? canon.rangeLabel(range[0], range[1], 'short')
  return (
    <button type="button" className={className} title={canon.rangeLabel(range[0], range[1])} onClick={() => goTo(range[0])}>
      {color && <span className="swatch" style={{ background: color }} />}
      {text}
    </button>
  )
}

export function EntityLink({ type, id, children, className = 'chip chip-link' }: { type: 'person' | 'place' | 'topic' | 'event' | 'study'; id: string; children: ReactNode; className?: string }) {
  return (
    <Link to={`/${type}/${encodeURIComponent(id)}`} className={className}>
      {children}
    </Link>
  )
}

const LINK = /\[([^\]]+)\]\(\(?([^)\s]+)\)/g

/** Render a dictionary paragraph whose markdown links point at references or entities. */
export function DictText({ text, canon }: { text: string; canon: Canon }) {
  const paras = text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="prose-dict">
      {paras.map((p, i) => (
        <p key={i}>{renderInline(p, canon)}</p>
      ))}
    </div>
  )
}

function renderInline(p: string, canon: Canon): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of p.matchAll(LINK)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(p.slice(last, idx))
    const label = m[1]
    const url = m[2]
    const entity = /^\/(person|place)\/([^/#?]+)/.exec(url)
    if (entity) {
      out.push(
        <Link key={k++} to={`/${entity[1]}/${entity[2]}`}>
          {label}
        </Link>,
      )
    } else {
      const parsed = parseRefs(label, canon)
      if (parsed.ranges.length) out.push(<RefLink key={k++} range={parsed.ranges[0]} canon={canon} label={label} className="text-accent hover:underline" />)
      else out.push(label)
    }
    last = idx + m[0].length
  }
  if (last < p.length) out.push(p.slice(last))
  return out.flatMap((node, i) => (typeof node === 'string' ? linkBareRefs(node, canon, `t${i}`) : [node]))
}

const BARE_REF = /\b((?:[1-3]\s?)?[A-Z][a-z]{1,14}\.?\s?\d{1,3}(?::\d{1,3}(?:\s?[-–]\s?\d{1,3}(?::\d{1,3})?)?)?)\b/g

/** Turn "1 Samuel 16:12" style references inside plain text into links. */
function linkBareRefs(text: string, canon: Canon, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(BARE_REF)) {
    const idx = m.index ?? 0
    const parsed = parseRefs(m[1], canon)
    if (!parsed.ranges.length || parsed.errors.length) continue
    if (idx > last) out.push(text.slice(last, idx))
    out.push(<RefLink key={`${keyPrefix}-${k++}`} range={parsed.ranges[0]} canon={canon} label={m[1]} className="text-accent hover:underline" />)
    last = idx + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}


/** The meaning of a name, with its Hebrew and Greek forms when known. */
export function NameCard({ name, meaning }: { name: string; meaning?: NameMeaning }) {
  if (!meaning?.meaning && !meaning?.hebrew) return null
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="kicker">Name</span>
      {meaning.hebrew && (
        <span className="flex items-baseline gap-2">
          <span lang="he" dir="rtl" className="text-lg leading-none">
            {meaning.hebrew}
          </span>
          {meaning.translit && <span className="text-ink-2 italic">{meaning.translit}</span>}
        </span>
      )}
      {meaning.greek && meaning.greek !== meaning.hebrew && (
        <span className="flex items-baseline gap-2">
          <span lang="grc" className="text-base leading-none">
            {meaning.greek}
          </span>
          {meaning.greekTranslit && <span className="text-ink-2 italic">{meaning.greekTranslit}</span>}
        </span>
      )}
      {meaning.meaning && (
        <span>
          <span className="text-ink-2">{name} means </span>
          <span className="font-medium">“{meaning.meaning}”</span>
        </span>
      )}
      {meaning.strongs && <span className="chip">Strong's {meaning.strongs}</span>}
      {meaning.hitchcock && <span className="text-ink-2">Hitchcock: {meaning.hitchcock}</span>}
    </div>
  )
}
