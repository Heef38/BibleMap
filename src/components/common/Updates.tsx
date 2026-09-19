import { Link } from 'react-router'
import type { Update } from '@/config/updates'
import { formatDay } from '@/store/updates'

/** A list of updates; the ones in `fresh` get a New marker. */
export function UpdateList({ items, fresh, onNavigate }: { items: Update[]; fresh?: Set<string>; onNavigate?: () => void }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((u) => {
        const isFresh = fresh?.has(u.id)
        return (
          <li key={u.id} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <time dateTime={u.date}>{formatDay(u.date)}</time>
              {isFresh && (
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
                  New
                </span>
              )}
            </div>
            <div className="font-medium leading-snug mt-0.5">{u.title}</div>
            <p className="text-ink-2 text-[13px] leading-snug mt-0.5">{u.body}</p>
            {u.link && (
              <Link to={u.link.to} onClick={onNavigate} className="inline-block text-[13px] mt-1">
                {u.link.label} →
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A small New tag for studies and features. */
export function NewTag() {
  return <span className="chip !py-0 !px-1.5 !text-[10.5px] font-semibold uppercase tracking-wide bg-accent-soft border-accent text-ink">New</span>
}
