import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'

export interface Settings {
  translation: string
  theme: Theme
  fontSize: FontSize
  redLetter: boolean
  showHeadings: boolean
  showNumbers: boolean
  showLeft: boolean
  /** the right pane, where studies, pages and maps open */
  showRight: boolean
  /** the share of the Bible and the right pane together that the Bible takes */
  bibleSplit: number
  /** the writings list at the foot of the left pane is open */
  writingsOpen: boolean
  /** the welcome card on the chapter view was put away */
  welcomed: boolean
  /** phones: keep the Bible open under the other pane instead of on its own tab */
  mobileBible: boolean
  /** phones: the share of the height the docked Bible takes */
  mobileSplit: number
  set: (patch: Partial<Omit<Settings, 'set'>>) => void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      translation: 'bsb',
      theme: 'system',
      fontSize: 'md',
      redLetter: true,
      showHeadings: true,
      showNumbers: true,
      showLeft: true,
      showRight: true,
      bibleSplit: 0.46,
      writingsOpen: true,
      welcomed: false,
      mobileBible: false,
      mobileSplit: 0.45,
      set: (patch) => set(patch),
    }),
    {
      name: 'biblemap.settings',
      // v1: the right pane stopped being the Bible, so a hidden reading pane no longer hides it.
      version: 1,
      migrate: (old, version) => {
        const s = (old ?? {}) as Partial<Settings>
        return (version < 1 ? { ...s, showRight: true } : s) as Settings
      },
      partialize: (s) => ({
        translation: s.translation,
        theme: s.theme,
        fontSize: s.fontSize,
        redLetter: s.redLetter,
        showHeadings: s.showHeadings,
        showNumbers: s.showNumbers,
        showLeft: s.showLeft,
        showRight: s.showRight,
        bibleSplit: s.bibleSplit,
        writingsOpen: s.writingsOpen,
        welcomed: s.welcomed,
        mobileBible: s.mobileBible,
        mobileSplit: s.mobileSplit,
      }),
    },
  ),
)

export const FONT_SIZES: Record<FontSize, string> = { sm: '15px', md: '17px', lg: '19px', xl: '22px' }
