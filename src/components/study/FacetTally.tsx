import { useEffect, useMemo, useRef, useState } from 'react'
import { RefLink } from '@/components/common/ui'
import { groupColor } from '@/components/viz/Sunburst'
import type { Bible, Study, StudyRef } from '@/data/types'
import type { Canon } from '@/lib/canon'

/** The first view with tagged passages: its groups become the filter above the charts. */
function scopeView(study: Study) {
  return study.views.find((v) => v.groups.some((g) => g.refs.some((r) => r.facets)))
}

/** Every tagged passage once, with the groups of the scope view it belongs to. */
function tagged(study: Study) {
  const scope = scopeView(study)
  const byKey = new Map<string, { ref: StudyRef; groups: Set<string> }>()
  for (const v of study.views)
    for (const g of v.groups)
      for (const r of g.refs) {
        if (!r.facets) continue
        const k = JSON.stringify(r.ranges)
        const e = byKey.get(k) ?? byKey.set(k, { ref: r, groups: new Set() }).get(k)!
        if (v === scope) e.groups.add(g.id)
      }
  return [...byKey.values()]
}

/**
 * The Patterns chart: for each facet, how many tagged passages carry each value, as a small bar
 * chart. Counts are of passages, not of verses. Click a bar to list them.
 */
export default function FacetTally({ study, canon, bible }: { study: Study; canon: Canon; bible?: Bible }) {
  const facets = study.facets ?? []
  // What one tagged passage is called here: events, accounts, promises.
  const unit = study.facetUnit ?? 'events'
  const one = unit.replace(/s$/, '')
  const count = (n: number) => `${n} ${n === 1 ? one : unit}`
  const events = useMemo(() => tagged(study), [study])
  // Narrow the counts to one group of the scope view (for miracles: healings, spirits, raisings, nature).
  const scopes = (scopeView(study)?.groups ?? []).filter((g) => events.some((e) => e.groups.has(g.id)))
  const [scope, setScope] = useState<string>('all')
  const [picked, setPicked] = useState<{ facet: string; value: string } | null>(null)
  const list = useRef<HTMLElement>(null)
  useEffect(() => {
    if (picked) list.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [picked])
  const inScope = scope === 'all' ? events : events.filter((e) => e.groups.has(scope))

  const pickedFacet = picked ? facets.find((f) => f.id === picked.facet) : undefined
  const pickedValue = pickedFacet?.values.find((v) => v.id === picked?.value)
  const pickedEvents = picked ? inScope.filter((e) => e.ref.facets?.[picked.facet]?.includes(picked.value)) : []
  const valueTitle = (fid: string, vid: string) => facets.find((f) => f.id === fid)?.values.find((v) => v.id === vid)?.title ?? vid

  return (
    <div>
      {scopes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-ink-2">Count</span>
          <div className="seg flex-wrap" role="group" aria-label={`Which ${unit} to count`}>
            <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
              All <span className="text-muted tabular-nums">{events.length}</span>
            </button>
            {scopes.map((g) => (
              <button key={g.id} type="button" aria-pressed={scope === g.id} onClick={() => setScope(g.id)}>
                {g.title} <span className="text-muted tabular-nums">{events.filter((e) => e.groups.has(g.id)).length}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {facets.map((f) => {
          const counted = inScope.filter((e) => e.ref.facets?.[f.id]?.length)
          // A facet that only tags passages outside the chosen group has nothing to show.
          if (!counted.length) return null
          const counts = f.values.map((v) => counted.filter((e) => e.ref.facets![f.id].includes(v.id)).length)
          const max = Math.max(1, ...counts)
          const multi = counted.some((e) => e.ref.facets![f.id].length > 1)
          return (
            <section key={f.id} className="rounded-xl border border-line bg-surface p-4" aria-label={f.title}>
              <h3 className="font-medium">{f.title}</h3>
              {f.note && <p className="text-xs text-ink-2 mt-0.5">{f.note}</p>}
              <p className="text-xs text-muted mt-1">
                {count(counted.length)}
                {multi ? `; one ${one} can count in more than one row` : ''}
              </p>
              <ul className="mt-3 space-y-0.5">
                {f.values.map((v, i) => {
                  const n = counts[i]
                  const on = picked?.facet === f.id && picked.value === v.id
                  const share = counted.length ? Math.round((100 * n) / counted.length) : 0
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        disabled={n === 0}
                        aria-pressed={on}
                        onClick={() => setPicked(on ? null : { facet: f.id, value: v.id })}
                        title={`${v.title}: ${n} of ${count(counted.length)} (${share}%)${v.note ? `. ${v.note}` : ''}`}
                        className={`w-full text-left rounded-lg px-2 py-1.5 -mx-2 ${on ? 'bg-accent-soft' : 'hover:bg-surface-2'} disabled:cursor-default disabled:hover:bg-transparent`}
                      >
                        <span className={`block text-sm leading-tight ${n === 0 ? 'text-muted' : ''}`}>{v.title}</span>
                        <span className="flex items-center gap-2 mt-1" aria-hidden>
                          <span className="flex-1 flex items-center min-w-0">
                            <span className="h-2.5 rounded-r-[4px] shrink-0" style={{ width: `${(88 * n) / max}%`, minWidth: n ? 3 : 0, background: groupColor(i) }} />
                            <span className="ml-2 text-xs tabular-nums text-ink-2">{n}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {picked && pickedFacet && pickedValue && (
        <section ref={list} className="mt-4 rounded-xl border border-line bg-surface p-4 scroll-mb-4" aria-live="polite">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="kicker">{pickedFacet.title}</span>
            <h3 className="font-medium">{pickedValue.title}</h3>
            <span className="text-xs text-muted">{count(pickedEvents.length)}</span>
            <button type="button" className="btn btn-ghost ml-auto text-xs" onClick={() => setPicked(null)}>
              Close
            </button>
          </div>
          {pickedValue.note && <p className="text-sm text-ink-2 mt-1">{pickedValue.note}</p>}
          <ul className="mt-2 divide-y divide-line">
            {pickedEvents.map(({ ref: r }) => (
              <li key={r.label} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium">{r.label}</span>
                  <RefLink range={r.ranges[0]} canon={canon} />
                </div>
                {r.note && <p className="text-ink-2 mt-0.5">{r.note}</p>}
                {!r.note && bible && <p className="font-serif text-ink-2 mt-0.5">{bible.verses[r.ranges[0][0]]}</p>}
                <p className="text-xs text-muted mt-1">
                  {facets
                    .filter((f) => f.id !== picked.facet && r.facets?.[f.id])
                    .map((f) => r.facets![f.id].map((vid) => valueTitle(f.id, vid)).join(', '))
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
