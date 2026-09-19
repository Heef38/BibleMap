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
  showRight: boolean
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
      mobileBible: false,
      mobileSplit: 0.45,
      set: (patch) => set(patch),
    }),
    {
      name: 'biblemap.settings',
      partialize: (s) => ({
        translation: s.translation,
        theme: s.theme,
        fontSize: s.fontSize,
        redLetter: s.redLetter,
        showHeadings: s.showHeadings,
        showNumbers: s.showNumbers,
        showLeft: s.showLeft,
        showRight: s.showRight,
        mobileBible: s.mobileBible,
        mobileSplit: s.mobileSplit,
      }),
    },
  ),
)

export const FONT_SIZES: Record<FontSize, string> = { sm: '15px', md: '17px', lg: '19px', xl: '22px' }
