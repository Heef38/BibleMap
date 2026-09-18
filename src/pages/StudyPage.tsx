import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import ArcDiagram, { categoryColor } from '@/components/viz/ArcDiagram'
import CanonStrip from '@/components/viz/CanonStrip'
import Sunburst, { groupColor, refFill } from '@/components/viz/Sunburst'
import { ErrorBlock, Loading, PageHeader, RefLink, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadStudy } from '@/data/loaders'
import type { StudyRef } from '@/data/types'
import { truncate } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

export default function StudyPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { data: canon } = useData('canon', loadCanon)
  const { data: study, error } = useData(`study:${id}`, () => loadStudy(id))
  const translation = useSettings((s) => s.translation)
  const { data: bible } = useData(`bible:${translation}`, () => loadBible(translation))
  const setHighlights = useSession((s) => s.setHighlights)
  const goTo = useSession((s) => s.goTo)
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedRef, setSelectedRef] = useState<StudyRef | null>(null)
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(() => new Set())

  const isConnections = study?.kind === 'connections'
  const viewId = params.get('view')
  const view = useMemo(() => study?.views.find((v) => v.id === viewId) ?? study?.views[0], [study, viewId])
  const chart = params.get('chart') ?? (isConnections ? 'arcs' : 'sunburst')

  useEffect(() => {
    setSelected(null)
    setSelectedRef(null)
  }, [view?.id])

  useEffect(() => {
    if (!view) return
    setHighlights(view.groups.map((g, i) => ({ ranges: g.refs.flatMap((r) => [...r.ranges, ...(r.to ?? [])]), color: groupColor(i), label: g.title })))
    return () => setHighlights([])
  }, [view, setHighlights])

  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !study || !view) return <div className="p-6"><Loading /></div>

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next)
  }
  const series = view.groups.map((g, i) => ({ ranges: g.refs.flatMap((r) => [...r.ranges, ...(r.to ?? [])]), color: groupColor(i), label: g.title }))
  const selectedGroup = view.groups.find((g) => g.id === selected) ?? null
  const groupsShown = selectedGroup ? [selectedGroup] : view.groups
  const totalWeight = view.groups.reduce((s, g) => s + g.weight, 0)
  const catCounts = new Map<string, number>()
  for (const g of view.groups) for (const r of g.refs) if (r.category) catCounts.set(r.category, (catCounts.get(r.category) ?? 0) + 1)
  const toggleCat = (cid: string) =>
    setHiddenCats((s) => {
      const n = new Set(s)
      if (n.has(cid)) n.delete(cid)
      else n.add(cid)
      return n
    })
  const snippet = (o: number, n: number) => (bible ? truncate(bible.verses[o], n) : '')

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        kicker={isConnections ? 'Study · connections' : 'Study'}
        title={study.title}
        subtitle={study.subtitle}
        right={
          study.views.length > 1 ? (
            <div className="seg" role="group" aria-label="Ways to view this study">
              {study.views.map((v) => (
                <button key={v.id} type="button" aria-pressed={v.id === view.id} onClick={() => setParam('view', v.id)}>
                  {v.title}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />
      {study.summary && <p className="text-ink-2 max-w-prose -mt-2 mb-5 leading-relaxed">{study.summary}</p>}
      {view.note && <p className="text-sm text-ink-2 max-w-prose mb-4">{view.note}</p>}

      {isConnections && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="seg" role="group" aria-label="Chart">
            <button type="button" aria-pressed={chart === 'arcs'} onClick={() => setParam('chart', 'arcs')}>
              Arcs
            </button>
            <button type="button" aria-pressed={chart === 'sunburst'} onClick={() => setParam('chart', 'sunburst')}>
              Sunburst
            </button>
          </div>
          {study.categories && (
            <div className="flex flex-wrap items-center gap-1.5 ml-2" role="group" aria-label="Filter by kind">
              {study.categories.map((c) => {
                const off = hiddenCats.has(c.id)
                return (
                  <button key={c.id} type="button" className="chip chip-link" aria-pressed={!off} style={{ opacity: off ? 0.45 : 1 }} onClick={() => toggleCat(c.id)} title={c.note}>
                    <span className="swatch" style={{ background: categoryColor(study.categories, c.id) }} />
                    {c.title} <span className="text-muted">{catCounts.get(c.id) ?? 0}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {isConnections && chart === 'arcs' ? (
        <div>
          <ArcDiagram study={study} view={view} canon={canon} bible={bible} selectedGroup={selected} hiddenCategories={hiddenCats} selectedRef={selectedRef} onSelect={setSelectedRef} />
          <p className="text-xs text-muted mt-1">Each arc joins an Old Testament passage to where the New Testament takes it up, colored by kind. Hover to read, click to pin a pair; pick a group below to focus on it.</p>
          {selectedRef && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                { label: selectedRef.label, range: selectedRef.ranges[0] },
                { label: selectedRef.toLabel ?? '', range: selectedRef.to?.[0] },
              ]
                .filter((x) => x.range)
                .map((x) => (
                  <button key={x.label} type="button" className="text-left rounded-xl border border-line bg-surface p-3 hover:border-line-strong" onClick={() => goTo(x.range![0])}>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className="swatch" style={{ background: categoryColor(study.categories, selectedRef.category) }} />
                      {x.label}
                    </div>
                    <div className="scripture !text-[15px] !leading-snug mt-1">{snippet(x.range![0], 260)}</div>
                  </button>
                ))}
              {selectedRef.note && <p className="text-sm text-ink-2 md:col-span-2">{selectedRef.note}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {view.groups.map((g, i) => (
              <button key={g.id} type="button" className="chip chip-link" aria-pressed={selected === g.id} style={selected === g.id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined} onClick={() => setSelected(selected === g.id ? null : g.id)}>
                <span className="swatch" style={{ background: groupColor(i) }} />
                {g.title} <span className="text-muted">{g.refs.length}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="@container">
          <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_260px] items-start">
            <div>
              <Sunburst study={study} view={view} bible={bible} selected={selected} onSelect={setSelected} />
              <p className="text-xs text-muted text-center mt-1">Sectors are sized by weight: the words of Jesus count three times, and are drawn solid. Click a group to zoom, a reference to read it.</p>
            </div>
            <div>
              <div className="kicker mb-2">{view.title}</div>
              <ol className="space-y-1">
                {view.groups.map((g, i) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-2 ${selected === g.id ? 'bg-accent-soft' : ''}`}
                      aria-pressed={selected === g.id}
                      onClick={() => setSelected(selected === g.id ? null : g.id)}
                    >
                      <span className="swatch" style={{ background: groupColor(i) }} />
                      <span className="text-sm min-w-0 flex-1 truncate">{g.title}</span>
                      <span className="text-xs text-muted tabular-nums">{g.refs.length}</span>
                      <span className="text-xs text-muted tabular-nums w-9 text-right">{totalWeight ? `${Math.round((100 * g.weight) / totalWeight)}%` : ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-4 text-xs text-ink-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="swatch" style={{ background: refFill(0, true) }} /> words of Jesus (weight 3)
                </div>
                <div className="flex items-center gap-2">
                  <span className="swatch" style={{ background: refFill(0, false) }} /> other references (weight 1)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <CanonStrip canon={canon} series={series} caption="Where the references fall, colored by group" />
      </div>

      <Section title={selectedGroup ? selectedGroup.title : 'All references'} count={groupsShown.reduce((s, g) => s + g.refs.length, 0)}>
        {groupsShown.map((g) => {
          const gi = view.groups.indexOf(g)
          return (
            <div key={g.id} className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="swatch" style={{ background: groupColor(gi) }} />
                <h3 className="font-medium">{g.title}</h3>
                <span className="text-xs text-muted">{g.verses.toLocaleString()} verses</span>
              </div>
              {g.note && <p className="text-sm text-ink-2 mb-2 max-w-prose">{g.note}</p>}
              <ul className="divide-y divide-line">
                {g.refs.map((r, i) => (
                  <li key={i} className="py-1.5 flex gap-3 items-baseline text-sm">
                    <span className="w-40 shrink-0 flex flex-wrap gap-1">
                      <RefLink range={r.ranges[0]} canon={canon} label={r.label} color={refFill(gi, r.jesus)} />
                      {r.to && r.toLabel && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted">→</span>
                          <RefLink range={r.to[0]} canon={canon} label={r.toLabel} />
                        </span>
                      )}
                    </span>
                    <span className="text-ink-2 min-w-0 flex-1">
                      {r.category && study.categories && (
                        <span className="chip mr-1.5 !py-0" style={{ borderColor: categoryColor(study.categories, r.category) }}>
                          {study.categories.find((c) => c.id === r.category)?.title ?? r.category}
                        </span>
                      )}
                      {r.note && <span>{r.note} </span>}
                      {bible && <span className="font-serif text-ink">{snippet(r.ranges[0][0], r.note ? 90 : 140)}</span>}
                    </span>
                    <span className="text-xs text-muted shrink-0 tabular-nums">×{r.weight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </Section>
    </div>
  )
}
