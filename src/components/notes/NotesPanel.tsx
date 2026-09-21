import { useEffect, useMemo, useRef } from 'react'
import { IconDown, IconDownload, IconNote, IconPlus, IconTrash, IconUp } from '@/components/common/icons'
import { RefLink, refsIn } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon } from '@/data/loaders'
import type { Canon } from '@/lib/canon'
import { noteTitle, notesMarkdown, useNotes } from '@/store/notes'
import { useSettings } from '@/store/settings'
import { useSession } from '@/store/session'

const chapterOf = (canon: Canon, o: number) => {
  const { b, c } = canon.locate(o)
  return canon.rangeLabel(canon.chapterStart(b, c), canon.chapterEnd(b, c))
}

/** Where the reader is now, to remember on a new note: "Kingdom of Heaven · Matthew 13". */
function contextNow(canon: Canon | undefined): string {
  const s = useSession.getState()
  const page = s.pageTitle && s.pageTitle !== 'This chapter' ? s.pageTitle : ''
  return [page, canon ? chapterOf(canon, s.readerOrdinal) : ''].filter(Boolean).join(' · ')
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const day = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** A notebook for studying: kept in this browser, with the references in each note as links. */
export default function NotesPanel() {
  const { data: canon } = useData('canon', loadCanon)
  const notes = useNotes((s) => s.notes)
  const openId = useNotes((s) => s.openId)
  const { add, edit, remove, open } = useNotes.getState()
  const notesOpen = useSettings((s) => s.notesOpen)
  const set = useSettings((s) => s.set)
  const focus = useSession((s) => s.focus)
  const readerOrdinal = useSession((s) => s.readerOrdinal)
  const area = useRef<HTMLTextAreaElement>(null)
  const note = notes.find((n) => n.id === openId)
  // With no notes yet, the editor is ready to write in; the first keystroke makes the note.
  const editing = !!note || notes.length === 0
  const refs = useMemo(() => (note && canon ? refsIn(note.text, canon) : []), [note, canon])

  const focusNonce = useRef(0)
  useEffect(() => {
    if (focusNonce.current && area.current) area.current.focus()
  }, [openId])

  const here = canon ? (focus !== null ? canon.label(focus) : chapterOf(canon, readerOrdinal)) : ''

  const insertHere = () => {
    if (!here) return
    const ta = area.current
    if (!note || !ta) {
      focusNonce.current++
      add(contextNow(canon), `${here} `)
      return
    }
    const a = ta.selectionStart
    const z = ta.selectionEnd
    const before = note.text.slice(0, a)
    const piece = `${before && !/\s$/.test(before) ? ' ' : ''}${here} `
    edit(note.id, before + piece + note.text.slice(z))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(a + piece.length, a + piece.length)
    })
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-1 pl-3 pr-1.5 h-10 shrink-0">
        <button type="button" className="flex items-center gap-1.5 min-w-0 text-left" onClick={() => set({ notesOpen: !notesOpen })} aria-expanded={notesOpen} title={notesOpen ? 'Fold the notes away' : 'Open the notes'}>
          <IconNote className="text-muted shrink-0" />
          <span className="kicker">Notes</span>
          {notes.length > 0 && <span className="text-xs text-muted">{notes.length}</span>}
        </button>
        <div className="ml-auto flex items-center">
          {notesOpen && (
            <>
              <button
                type="button"
                className="btn btn-ghost !px-1.5"
                title="New note"
                aria-label="New note"
                onClick={() => {
                  focusNonce.current++
                  add(contextNow(canon))
                }}
              >
                <IconPlus />
              </button>
              <button
                type="button"
                className="btn btn-ghost !px-1.5"
                title="Save all notes to a file"
                aria-label="Save all notes to a file"
                disabled={!notes.length}
                onClick={() => download(`biblemap-notes-${new Date().toISOString().slice(0, 10)}.md`, notesMarkdown(notes))}
              >
                <IconDownload />
              </button>
            </>
          )}
          <button type="button" className="btn btn-ghost !px-1.5" onClick={() => set({ notesOpen: !notesOpen })} title={notesOpen ? 'Fold the notes away' : 'Open the notes'} aria-label={notesOpen ? 'Fold the notes away' : 'Open the notes'}>
            {notesOpen ? <IconDown /> : <IconUp />}
          </button>
        </div>
      </div>

      {notesOpen && editing && (
        <div className="flex-1 min-h-0 flex flex-col px-3 pb-3">
          {note && (
            <div className="flex items-center gap-2 text-xs text-muted mb-1.5 min-w-0">
              <button type="button" className="text-accent shrink-0" onClick={() => open(null)}>
                ← All notes
              </button>
              {note.context && <span className="truncate" title={`Started in ${note.context}`}>{note.context}</span>}
            </div>
          )}
          <textarea
            ref={area}
            className="field flex-1 min-h-[4.5rem] resize-none text-[13px] leading-relaxed"
            value={note?.text ?? ''}
            placeholder="Write what you notice as you read. References such as Rom 5:8 turn into links below."
            aria-label="Note"
            onChange={(e) => (note ? edit(note.id, e.target.value) : add(contextNow(canon), e.target.value))}
          />
          {refs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 max-h-14 overflow-y-auto">
              {refs.map((r) => canon && <RefLink key={r.label} range={r.range} canon={canon} label={r.label} />)}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <button type="button" className="btn !py-0.5 !px-2 text-xs min-w-0" onClick={insertHere} disabled={!here} title={`Write ${here} into the note`}>
              <IconPlus width={12} height={12} className="shrink-0" /> <span className="truncate">{here}</span>
            </button>
            {note && (
              <button
                type="button"
                className="btn btn-ghost !px-1.5 ml-auto text-muted"
                title="Delete this note"
                aria-label="Delete this note"
                onClick={() => {
                  if (!note.text.trim() || window.confirm(`Delete “${noteTitle(note)}”?`)) remove(note.id)
                }}
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>
      )}

      {notesOpen && !editing && (
        <div className="flex-1 min-h-0 flex flex-col px-3 pb-2">
          <ul className="flex-1 min-h-0 overflow-y-auto -mx-2">
            {notes.map((n) => (
              <li key={n.id}>
                <button type="button" className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface-2" onClick={() => open(n.id)}>
                  <div className="text-sm font-medium truncate">{noteTitle(n)}</div>
                  <div className="text-xs text-muted truncate">{[n.context, day(n.updated)].filter(Boolean).join(' · ')}</div>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted mt-1.5 leading-snug">Notes stay in this browser. Save them to a file to keep a copy.</p>
        </div>
      )}
    </div>
  )
}
