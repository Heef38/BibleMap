import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { create } from 'zustand'
import type { Range } from '@/lib/refs'
import { useSettings } from './settings'
import { SITE } from '@/config/site'

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
  /** what the right pane shows, for the pane's bar and the tab title */
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

/** Set a <meta> tag (by name or by property), adding it if the page does not have it yet. */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export interface PageMeta {
  /** what search results and link previews say about this page (the site's description by default) */
  description?: string
  /** the browser tab's title when it should differ from the pane's ("This chapter" on the home page) */
  docTitle?: string
  /** keep this page out of search results (the not-found page) */
  noindex?: boolean
}

/**
 * Name what the right pane shows: its bar and the browser tab use it. It also tells
 * search engines about the page: its title and description, and its canonical address, which is
 * the path alone, so the reader's position (?p=) and the verse map (?v=) never count as other pages.
 */
export function usePageTitle(title: string | undefined, meta?: PageMeta) {
  const setPageTitle = useSession((s) => s.setPageTitle)
  const { pathname } = useLocation()
  const description = meta?.description ?? SITE.description
  const docTitle = meta?.docTitle
  const noindex = !!meta?.noindex
  useEffect(() => {
    if (!title) return
    setPageTitle(title)
    const full = docTitle ?? `${title} · ${SITE.name}`
    document.title = full
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', `${SITE.url}${pathname}`)
    setMeta('name', 'robots', noindex ? 'noindex' : 'index, follow')
    setCanonical(`${SITE.url}${pathname}`)
  }, [title, docTitle, description, noindex, pathname, setPageTitle])
}
