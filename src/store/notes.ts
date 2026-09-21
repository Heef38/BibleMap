import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Note {
  id: string
  text: string
  /** where the reader was when the note was started, e.g. "Kingdom of Heaven · Matthew 13" */
  context?: string
  created: number
  updated: number
}

interface NotesState {
  notes: Note[]
  /** the note open in the editor; null shows the list */
  openId: string | null
  /** Start a note and open it. */
  add: (context?: string, text?: string) => string
  edit: (id: string, text: string) => void
  remove: (id: string) => void
  open: (id: string | null) => void
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
/** A note started and left without a word in it is not kept. */
const dropEmpty = (notes: Note[], keep: string | null) => notes.filter((n) => n.id === keep || n.text.trim())

/** Notes live in this browser only, until there are accounts to keep them. */
export const useNotes = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      openId: null,
      add: (context, text = '') => {
        const now = Date.now()
        const note: Note = { id: newId(), text, context, created: now, updated: now }
        set((s) => ({ notes: [note, ...dropEmpty(s.notes, null)], openId: note.id }))
        return note.id
      },
      edit: (id, text) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, text, updated: Date.now() } : n)) })),
      remove: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id), openId: s.openId === id ? null : s.openId })),
      open: (openId) => set((s) => ({ openId, notes: dropEmpty(s.notes, openId) })),
    }),
    { name: 'biblemap.notes', partialize: (s) => ({ notes: s.notes, openId: s.openId }) },
  ),
)

/** The first line of a note, as its title. */
export function noteTitle(n: Note): string {
  return n.text.trim().split('\n')[0].trim() || 'Untitled note'
}

/** Every note as one Markdown file, newest first. */
export function notesMarkdown(notes: Note[]): string {
  const day = (t: number) => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const parts = ['# BibleMap notes', '']
  for (const n of notes) {
    parts.push(`## ${noteTitle(n)}`, '', `_${[n.context, day(n.updated)].filter(Boolean).join(' · ')}_`, '', n.text.trim(), '')
  }
  return parts.join('\n')
}
