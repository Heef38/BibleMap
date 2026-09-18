import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState, Loading, PageHeader } from '@/components/common/ui'
import { IconUp } from '@/components/common/icons'
import { SITE } from '@/config/site'
import { KIND_LABELS, LIMITS, STATUS_LABELS, adminKey, feedbackApi, loadVoted, saveVoted, type FeedbackItem, type FeedbackKind, type FeedbackStatus } from '@/lib/feedback'

type Sort = 'top' | 'new'
type Filter = 'all' | FeedbackKind

const KINDS = Object.keys(KIND_LABELS) as FeedbackKind[]
const STATUSES = Object.keys(STATUS_LABELS) as FeedbackStatus[]
const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['idea', 'Ideas'],
  ['problem', 'Problems'],
  ['content', 'Content'],
  ['other', 'Other'],
]
const PLACEHOLDERS: Record<FeedbackKind, string> = {
  idea: 'What would make BibleMap more useful to you?',
  problem: 'What went wrong, and on which page?',
  content: 'Which verse, person, place or study, and what should change?',
  other: 'Anything else on your mind.',
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
function when(iso: string): string {
  const t = Date.parse(iso)
  const mins = Math.round((t - Date.now()) / 60000)
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
  if (Math.abs(mins) < 60 * 24) return rtf.format(Math.round(mins / 60), 'hour')
  if (Math.abs(mins) < 60 * 24 * 14) return rtf.format(Math.round(mins / 1440), 'day')
  const d = new Date(t)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export default function FeedbackPage() {
  const [params] = useSearchParams()
  const ownerMode = params.has('admin')
  const [items, setItems] = useState<FeedbackItem[] | null>(null)
  // Votes as of the last load: sorting by these keeps a post from jumping away as you vote on it.
  const [ranked, setRanked] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [voted, setVoted] = useState(loadVoted)
  const [sort, setSort] = useState<Sort>('top')
  const [filter, setFilter] = useState<Filter>('all')
  const [composing, setComposing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await feedbackApi.list(ownerMode && !!adminKey.get())
      setItems(res.items)
      setRanked(Object.fromEntries(res.items.map((it) => [it.id, it.votes])))
      setIsAdmin(res.admin)
      setLoadError(null)
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }, [ownerMode])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => {
    const list = (items ?? []).filter((it) => filter === 'all' || it.kind === filter)
    const rank = (it: FeedbackItem) => ranked[it.id] ?? it.votes
    return sort === 'top' ? [...list].sort((a, b) => rank(b) - rank(a) || b.created.localeCompare(a.created)) : [...list].sort((a, b) => b.created.localeCompare(a.created))
  }, [items, ranked, sort, filter])

  const replace = (next: FeedbackItem) => setItems((list) => list?.map((it) => (it.id === next.id ? next : it)) ?? null)

  const toggleVote = async (item: FeedbackItem) => {
    const up = !voted.has(item.id)
    const mark = (on: boolean, votes: number) => {
      setVoted((prev) => {
        const next = new Set(prev)
        if (on) next.add(item.id)
        else next.delete(item.id)
        saveVoted(next)
        return next
      })
      replace({ ...item, votes })
    }
    mark(up, item.votes + (up ? 1 : -1))
    try {
      const res = await feedbackApi.vote(item.id, up)
      mark(up, res.votes)
    } catch (e) {
      mark(!up, item.votes)
      setNotice((e as Error).message)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        kicker="Feedback"
        title="Ideas and feedback"
        subtitle="Suggest a feature, report a problem, or point out a mistake in the Bible data. No account needed. Upvote the posts you agree with, and the most wanted rise to the top."
        right={
          !composing && (
            <button type="button" className="btn btn-primary" onClick={() => setComposing(true)}>
              New post
            </button>
          )
        }
      />

      {ownerMode && <OwnerBar isAdmin={isAdmin} onChange={load} />}

      {composing && (
        <Composer
          onCancel={() => setComposing(false)}
          onPosted={(item) => {
            setComposing(false)
            setNotice('Thank you! Your post is up.')
            if (!item) return
            setItems((list) => [item, ...(list ?? [])])
            setVoted((prev) => {
              const next = new Set(prev).add(item.id)
              saveVoted(next)
              return next
            })
            setSort('new')
          }}
        />
      )}

      {notice && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          <span className="flex-1">{notice}</span>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="seg" role="group" aria-label="Sort">
          {(['top', 'new'] as Sort[]).map((s) => (
            <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)}>
              {s === 'top' ? 'Top' : 'New'}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Show">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        {items && <span className="text-xs text-muted ml-auto">{shown.length === 1 ? '1 post' : `${shown.length} posts`}</span>}
      </div>

      {loadError ? (
        <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm">
          <div className="font-medium">The feedback board did not load.</div>
          <div className="text-ink-2 mt-1">{loadError}</div>
        </div>
      ) : !items ? (
        <Loading />
      ) : shown.length === 0 ? (
        <EmptyState>{items.length ? 'Nothing here yet.' : 'No posts yet. Be the first to share an idea.'}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <Post key={item.id} item={item} voted={voted.has(item.id)} onVote={() => toggleVote(item)} admin={isAdmin} onChanged={replace} onDeleted={() => setItems((list) => list?.filter((it) => it.id !== item.id) ?? null)} onError={setNotice} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Post({ item, voted, onVote, admin, onChanged, onDeleted, onError }: { item: FeedbackItem; voted: boolean; onVote: () => void; admin: boolean; onChanged: (it: FeedbackItem) => void; onDeleted: () => void; onError: (msg: string) => void }) {
  const highlighted = item.status === 'planned' || item.status === 'doing' || item.status === 'done'
  return (
    <li className={`flex gap-3 rounded-xl border border-line bg-surface p-3 ${item.hidden ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onVote}
        aria-pressed={voted}
        aria-label={`${voted ? 'Take back your vote for' : 'Upvote'} “${item.title}”, ${item.votes} ${item.votes === 1 ? 'vote' : 'votes'}`}
        title={voted ? 'You upvoted this. Click to take it back.' : 'Upvote'}
        className={`flex flex-col items-center justify-center self-start shrink-0 w-12 rounded-lg border py-1 cursor-pointer ${voted ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-surface-2'}`}
        style={{ color: voted ? 'var(--accent)' : 'var(--ink-2)' }}
      >
        <IconUp width={18} height={18} />
        <span className="text-sm font-semibold tabular-nums leading-tight">{item.votes}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-snug break-words">{item.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="chip">{KIND_LABELS[item.kind]}</span>
          {item.status !== 'open' && <span className={`chip ${highlighted ? 'bg-accent-soft border-accent text-ink' : ''}`}>{STATUS_LABELS[item.status]}</span>}
          {item.hidden && <span className="chip">Hidden</span>}
          <span>
            {item.name || 'Anonymous'} · <time dateTime={item.created}>{when(item.created)}</time>
          </span>
        </div>
        {item.body && <p className="mt-2 text-sm text-ink-2 whitespace-pre-wrap break-words">{item.body}</p>}
        {item.reply && (
          <div className="mt-2 rounded-lg border-l-2 border-accent bg-surface-2 px-3 py-2 text-sm">
            <div className="kicker mb-0.5">{SITE.author} replied</div>
            <p className="whitespace-pre-wrap break-words">{item.reply}</p>
          </div>
        )}
        {admin && <OwnerControls item={item} onChanged={onChanged} onDeleted={onDeleted} onError={onError} />}
      </div>
    </li>
  )
}

function Composer({ onPosted, onCancel }: { onPosted: (item: FeedbackItem | null) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 3) {
      setError('Please give your post a short title.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await feedbackApi.create({ kind, title, body, name, website })
      onPosted(res.item)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="relative mb-5 rounded-xl border border-line bg-surface p-4 space-y-3" aria-label="New post">
      <div className="seg" role="group" aria-label="Kind of post">
        {KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="block text-ink-2 mb-1">Title</span>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} placeholder="A short summary" autoFocus required />
      </label>
      <label className="block">
        <span className="block text-ink-2 mb-1">
          Details <span className="text-muted">(optional)</span>
        </span>
        <textarea className="field min-h-24" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={LIMITS.body} placeholder={PLACEHOLDERS[kind]} />
      </label>
      <label className="block">
        <span className="block text-ink-2 mb-1">
          Your name <span className="text-muted">(optional)</span>
        </span>
        <input className="field sm:max-w-xs" value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.name} placeholder="Leave blank to post anonymously" autoComplete="nickname" />
      </label>
      {/* Hidden from people; bots that fill every field give themselves away. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-wj">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted flex-1 min-w-48">Everyone can read posts, so please leave out private details.</span>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}

/** Shown at /feedback?admin. The key is the ADMIN_TOKEN set on the server. */
function OwnerBar({ isAdmin, onChange }: { isAdmin: boolean; onChange: () => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const unlock = async (e: FormEvent) => {
    e.preventDefault()
    adminKey.set(key.trim())
    try {
      const res = await feedbackApi.list(true)
      if (!res.admin) throw new Error('That admin key is not right.')
      setError(null)
      onChange()
    } catch (err) {
      adminKey.set('')
      setError((err as Error).message)
    }
  }
  return (
    <div className="mb-4 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-sm">
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">Owner</span>
          <span className="text-ink-2 flex-1">You can see hidden posts, set a status, reply, hide and delete.</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              adminKey.set('')
              onChange()
            }}
          >
            Lock
          </button>
        </div>
      ) : (
        <form onSubmit={unlock} className="flex flex-wrap items-center gap-2">
          <span className="kicker">Owner</span>
          <input type="password" className="field max-w-64" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin key" autoComplete="current-password" aria-label="Admin key" />
          <button type="submit" className="btn">
            Unlock
          </button>
          {error && <span className="text-wj">{error}</span>}
        </form>
      )}
    </div>
  )
}

function OwnerControls({ item, onChanged, onDeleted, onError }: { item: FeedbackItem; onChanged: (it: FeedbackItem) => void; onDeleted: () => void; onError: (msg: string) => void }) {
  const [reply, setReply] = useState(item.reply)
  const [busy, setBusy] = useState(false)
  const act = async (patch: Parameters<typeof feedbackApi.moderate>[1]) => {
    setBusy(true)
    try {
      const res = await feedbackApi.moderate(item.id, patch)
      if (res.deleted) onDeleted()
      else if (res.item) onChanged({ ...res.item, votes: item.votes })
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3 pt-3 border-t border-line space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <select className="field w-auto" value={item.status} disabled={busy} onChange={(e) => act({ status: e.target.value as FeedbackStatus })} aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button type="button" className="btn" disabled={busy} onClick={() => act({ hidden: !item.hidden })}>
          {item.hidden ? 'Unhide' : 'Hide'}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => window.confirm(`Delete “${item.title}” for good?`) && act({ delete: true })}>
          Delete
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <textarea className="field flex-1 min-w-60" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={LIMITS.reply} placeholder="Reply publicly (optional)" aria-label="Reply" />
        <button type="button" className="btn" disabled={busy || reply === item.reply} onClick={() => act({ reply })}>
          Save reply
        </button>
      </div>
    </div>
  )
}
