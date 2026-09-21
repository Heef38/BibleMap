import { useEffect } from 'react'
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

/** Where the reader, the verse map and the phone pane were, kept on a history entry. */
export interface ReaderPlace {
  ordinal: number
  focus: number | null
  mapVerse: number | null
  pane: MobilePane
}

/**
 * How the next reader move reaches the browser history: a jump (a reference, a cross reference,
 * the book picker) or a verse picked for its map adds a Back step; turning a chapter updates the current one;
 * a move that came from the history itself (Back, Forward, a shared link) writes nothing.
 */
export type ReaderHistory = 'push' | 'replace' | 'none'

interface Session {
  /** any verse ordinal inside the chapter the reader shows */
  readerOrdinal: number
  /** the verse the reader scrolls to and marks as focused */
  focus: number | null
  /** the verse whose connection map covers the right pane (a verse picked in the reader) */
  mapVerse: number | null
  /** the right pane spreads over the Bible (desktop), for wide charts */
  wide: boolean
  /** what the right pane shows, for the pane's bar, notes and the tab title */
  pageTitle: string
  highlights: Highlight[]
  mobilePane: MobilePane
  /** bumped whenever something asks the search box to take focus */
  searchNonce: number
  history: ReaderHistory
  /** where things were before the last move, saved on the history entry it leaves */
  before: ReaderPlace
  focusSearch: () => void
  /** Show this verse in the reader (and focus it). A new Back step unless `history: 'replace'`. */
  goTo: (ordinal: number, opts?: { focus?: boolean; pane?: boolean; history?: 'push' | 'replace' }) => void
  /** Put the reader where a history entry says it was, without writing history. */
  restore: (ordinal: number, focus: boolean) => void
  /** Put the verse map where a history entry says it was, without writing history. */
  restoreMap: (ordinal: number | null) => void
  /** A verse picked in the reader: focus it and open its connection map (null lets it go). A Back step. */
  selectVerse: (ordinal: number | null) => void
  /** Move the verse map to another verse, and the reader with it. A Back step. */
  centerMap: (ordinal: number) => void
  setWide: (wide: boolean) => void
  setPageTitle: (title: string) => void
  setHighlights: (highlights: Highlight[]) => void
  setMobilePane: (pane: MobilePane) => void
}

const placeOf = (s: Session): ReaderPlace => ({ ordinal: s.readerOrdinal, focus: s.focus, mapVerse: s.mapVerse, pane: s.mobilePane })

export const useSession = create<Session>()((set) => ({
  readerOrdinal: 0,
  focus: null,
  mapVerse: null,
  wide: false,
  pageTitle: '',
  highlights: [],
  mobilePane: 'map',
  searchNonce: 0,
  history: 'none',
  before: { ordinal: 0, focus: null, mapVerse: null, pane: 'map' },
  focusSearch: () => set((s) => ({ searchNonce: s.searchNonce + 1, mobilePane: 'explore' })),
  goTo: (ordinal, opts) =>
    set((s) => ({
      readerOrdinal: ordinal,
      focus: opts?.focus === false ? null : ordinal,
      // With the Bible docked under the page (phones), it is already in view.
      mobilePane: opts?.pane === false || useSettings.getState().mobileBible ? s.mobilePane : 'read',
      // Asking to read something brings the Bible back from behind a widened chart.
      wide: opts?.pane === false ? s.wide : false,
      before: placeOf(s),
      history: opts?.history ?? 'push',
    })),
  restore: (ordinal, focus) => set({ readerOrdinal: ordinal, focus: focus ? ordinal : null, history: 'none' }),
  restoreMap: (mapVerse) => set({ mapVerse, history: 'none' }),
  selectVerse: (ordinal) =>
    set((s) => ({
      focus: ordinal,
      mapVerse: ordinal,
      // A docked Bible on a phone has the page above it: show the map there.
      mobilePane: ordinal !== null && useSettings.getState().mobileBible ? 'map' : s.mobilePane,
      before: placeOf(s),
      history: 'push',
    })),
  centerMap: (ordinal) =>
    set((s) => ({
      readerOrdinal: ordinal,
      focus: ordinal,
      mapVerse: ordinal,
      before: placeOf(s),
      history: 'push',
    })),
  setWide: (wide) => set({ wide }),
  setPageTitle: (pageTitle) => set({ pageTitle }),
  setHighlights: (highlights) => set({ highlights }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
}))

/** Name what the right pane shows: its bar, new notes and the browser tab use it. */
export function usePageTitle(title: string | undefined) {
  const setPageTitle = useSession((s) => s.setPageTitle)
  useEffect(() => {
    if (!title) return
    setPageTitle(title)
    document.title = `${title} · BibleMap`
  }, [title, setPageTitle])
}
