import { create } from 'zustand'
import type { Range } from '@/lib/refs'
import { useSettings } from './settings'

export interface Highlight {
  ranges: Range[]
  /** CSS color for the reader's verse marker */
  color?: string
  label?: string
}

export type MobilePane = 'explore' | 'map' | 'read'

/**
 * How the next reader move reaches the browser history: a jump (a reference, a cross reference,
 * the book picker) adds a Back step; turning a chapter or focusing a verse updates the current one;
 * a move that came from the history itself (Back, Forward, a shared link) writes nothing.
 */
export type ReaderHistory = 'push' | 'replace' | 'none'

interface Session {
  /** any verse ordinal inside the chapter the reader shows */
  readerOrdinal: number
  /** the verse the reader scrolls to and marks as focused */
  focus: number | null
  highlights: Highlight[]
  mobilePane: MobilePane
  /** bumped whenever something asks the search box to take focus */
  searchNonce: number
  history: ReaderHistory
  /** where the reader and the mobile pane were before the last goTo, saved on the history entry it leaves */
  before: { ordinal: number; focus: number | null; pane: MobilePane }
  focusSearch: () => void
  /** Show this verse in the reader (and focus it). A new Back step unless `history: 'replace'`. */
  goTo: (ordinal: number, opts?: { focus?: boolean; pane?: boolean; history?: 'push' | 'replace' }) => void
  /** Put the reader where a history entry says it was, without writing history. */
  restore: (ordinal: number, focus: boolean) => void
  setFocus: (ordinal: number | null) => void
  setHighlights: (highlights: Highlight[]) => void
  setMobilePane: (pane: MobilePane) => void
}

export const useSession = create<Session>()((set) => ({
  readerOrdinal: 0,
  focus: null,
  highlights: [],
  mobilePane: 'map',
  searchNonce: 0,
  history: 'none',
  before: { ordinal: 0, focus: null, pane: 'map' },
  focusSearch: () => set((s) => ({ searchNonce: s.searchNonce + 1, mobilePane: 'explore' })),
  goTo: (ordinal, opts) =>
    set((s) => ({
      readerOrdinal: ordinal,
      focus: opts?.focus === false ? null : ordinal,
      // With the Bible docked under the page (phones), it is already in view.
      mobilePane: opts?.pane === false || useSettings.getState().mobileBible ? s.mobilePane : 'read',
      before: { ordinal: s.readerOrdinal, focus: s.focus, pane: s.mobilePane },
      history: opts?.history ?? 'push',
    })),
  restore: (ordinal, focus) => set({ readerOrdinal: ordinal, focus: focus ? ordinal : null, history: 'none' }),
  setFocus: (focus) => set({ focus, history: 'replace' }),
  setHighlights: (highlights) => set({ highlights }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
}))
