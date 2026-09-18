import { create } from 'zustand'
import type { Range } from '@/lib/refs'

export interface Highlight {
  ranges: Range[]
  /** CSS color for the reader's verse marker */
  color?: string
  label?: string
}

export type MobilePane = 'explore' | 'map' | 'read'

interface Session {
  /** any verse ordinal inside the chapter the reader shows */
  readerOrdinal: number
  /** the verse the reader scrolls to and marks as focused */
  focus: number | null
  highlights: Highlight[]
  mobilePane: MobilePane
  /** bumped whenever something asks the search box to take focus */
  searchNonce: number
  focusSearch: () => void
  /** Show this verse in the reader (and focus it). */
  goTo: (ordinal: number, opts?: { focus?: boolean; pane?: boolean }) => void
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
  focusSearch: () => set((s) => ({ searchNonce: s.searchNonce + 1, mobilePane: 'explore' })),
  goTo: (ordinal, opts) =>
    set((s) => ({
      readerOrdinal: ordinal,
      focus: opts?.focus === false ? null : ordinal,
      mobilePane: opts?.pane === false ? s.mobilePane : 'read',
    })),
  setFocus: (focus) => set({ focus }),
  setHighlights: (highlights) => set({ highlights }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
}))
