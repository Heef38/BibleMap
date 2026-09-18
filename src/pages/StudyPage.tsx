import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import Sunburst, { groupColor, refFill } from '@/components/viz/Sunburst'
import { ErrorBlock, Loading, PageHeader, RefLink, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadBible, loadCanon, loadStudy } from '@/data/loaders'
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
  const [selected, setSelected] = useState<string | null>(null)

  const viewId = params.get('view')
  const view = useMemo(() => study?.views.find((v) => v.id === viewId) ?? study?.views[0], [study, viewId])

  useEffect(() => {
    setSelected(null)
  }, [view?.id])

  useEffect(() => {
    if (!view) return
    setHighlights(view.groups.map((g, i) => ({ ranges: g.refs.flatMap((r) => r.ranges), color: groupColor(i), label: g.title })))
    return () => setHighlights([])
  }, [view, setHighlights])

  if (error) return <div className="p-6"><ErrorBlock error={error} /></div>
  if (!canon || !study || !view) return <div className="p-6"><Loading /></div>

  const series = view.groups.map((g, i) => ({ ranges: g.refs.flatMap((r) => r.ranges), color: groupColor(i), label: g.title }))
  const selectedGroup = view.groups.find((g) => g.id === selected) ?? null
  const groupsShown = selectedGroup ? [selectedGroup] : view.groups
  const totalWeight = view.groups.reduce((s, g) => s + g.weight, 0)

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        kicker="Study"
        title={study.title}
        subtitle={study.subtitle}
        right={
          study.views.length > 1 ? (
            <div className="seg" role="group" aria-label="Ways to view this study">
              {study.views.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={v.id === view.id}
                  onClick={() => {
                    const next = new URLSearchParams(params)
                    next.set('view', v.id)
                    setParams(next)
                  }}
                >
                  {v.title}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />
      {study.summary && <p className="text-ink-2 max-w-prose -mt-2 mb-5 leading-relaxed">{study.summary}</p>}
      {view.note && <p className="text-sm text-ink-2 max-w-prose mb-4">{view.note}</p>}

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
                    <span className="w-36 shrink-0">
                      <RefLink range={r.ranges[0]} canon={canon} label={r.label} color={refFill(gi, r.jesus)} />
                    </span>
                    <span className="text-ink-2 min-w-0 flex-1">
                      {r.note && <span>{r.note} </span>}
                      {bible && <span className="font-serif text-ink">{truncate(bible.verses[r.ranges[0][0]], r.note ? 90 : 140)}</span>}
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
