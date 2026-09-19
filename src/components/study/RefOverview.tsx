import { useEffect, useRef } from 'react'
import { RefLink } from '@/components/common/ui'
import { categoryColor } from '@/components/viz/ArcDiagram'
import { groupColor, refFill } from '@/components/viz/Sunburst'
import { IconX } from '@/components/common/icons'
import type { Bible, Study, StudyGroup, StudyRef, StudyView } from '@/data/types'
import type { Canon } from '@/lib/canon'
import { truncate } from '@/lib/format'
import { useSession } from '@/store/session'

/** What a reference is about: its note, its text, and everything it connects to. */
export default function RefOverview({ study, view, group, item, canon, bible, onClose }: { study: Study; view: StudyView; group: StudyGroup; item: StudyRef; canon: Canon; bible?: Bible; onClose: () => void }) {
  const goTo = useSession((s) => s.goTo)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [item])
  const gi = view.groups.indexOf(group)
  const catTitle = (id?: string) => (id ? study.categories?.find((c) => c.id === id)?.title : undefined)
  const text = bible ? truncate(item.ranges.map(([s, e]) => bible.verses.slice(s, Math.min(e, s + 6) + 1).join(' ')).join(' … '), 460) : undefined
  const topics = [...new Set((item.links ?? []).map((l) => l.topic ?? catTitle(l.category) ?? 'Related passages'))]
  return (
    <div ref={box} className="rounded-xl border border-line bg-surface p-4 text-sm" role="region" aria-label={`Overview of ${item.label}`}>
      <div className="flex items-start gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          <span className="chip">{truncate(study.title, 26)}</span>
          <span className="chip">
            <span className="swatch" style={{ background: groupColor(gi) }} /> {truncate(group.title, 26)}
          </span>
        </div>
        <button type="button" className="btn btn-ghost ml-auto -mr-2 -mt-1" onClick={onClose} title="Close">
          <IconX />
        </button>
      </div>
      <div className="kicker mt-2">Reference</div>
      <h3 className="font-semibold text-base leading-tight mt-0.5">{item.label}</h3>
      <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
        {item.category && study.categories && (
          <span className="chip !py-0" style={{ borderColor: categoryColor(study.categories, item.category) }}>
            {catTitle(item.category)}
          </span>
        )}
        {item.jesusOwn ? (
          <span className="chip !py-0">
            <span className="swatch" style={{ background: refFill(gi, true) }} /> words of Jesus
          </span>
        ) : item.jesus ? (
          <span className="chip !py-0">
            <span className="swatch" style={{ background: refFill(gi, true) }} /> connected by Jesus
          </span>
        ) : null}
        <span className="chip !py-0">weight {item.weight}</span>
      </div>
      {item.note && <p className="text-ink-2 mt-2 leading-snug">{item.note}</p>}
      {item.facets && study.facets && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {study.facets
            .filter((f) => item.facets![f.id])
            .map((f) => (
              <div key={f.id} className="contents">
                <dt className="text-muted">{f.title}</dt>
                <dd>{item.facets![f.id].map((vid) => f.values.find((v) => v.id === vid)?.title ?? vid).join(', ')}</dd>
              </div>
            ))}
        </dl>
      )}
      {text && <p className="scripture !text-[14.5px] !leading-snug mt-2">{text}</p>}
      {topics.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {topics.map((topic) => (
            <div key={topic}>
              <div className="text-xs text-ink-2 mb-0.5">{topic}</div>
              <div className="flex flex-wrap gap-1">
                {item
                  .links!.filter((l) => (l.topic ?? catTitle(l.category) ?? 'Related passages') === topic)
                  .map((l, i) => (
                    <RefLink key={i} range={l.ranges[0]} canon={canon} label={l.label} color={l.category && study.categories ? categoryColor(study.categories, l.category) : undefined} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" className="btn btn-primary" onClick={() => goTo(item.ranges[0][0])}>
          Read {canon.rangeLabel(item.ranges[0][0], item.ranges[0][1], 'short')}
        </button>
        {item.ranges.slice(1).map((r) => (
          <RefLink key={r[0]} range={r} canon={canon} className="btn" />
        ))}
      </div>
    </div>
  )
}
