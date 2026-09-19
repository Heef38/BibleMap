import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UPDATES, type Update } from '@/config/updates'

const DAY = 86_400_000
/** On a first visit, only what shipped in the last two weeks counts as new. */
const FIRST_VISIT_DAYS = 14
/** How long a study stays marked New after its `added` date. */
export const NEW_STUDY_DAYS = 30

interface UpdatesState {
  /** ids of the updates this browser has seen; null before the first look */
  seen: string[] | null
  markSeen: () => void
}

export const useUpdates = create<UpdatesState>()(
  persist(
    (set) => ({
      seen: null,
      markSeen: () => set({ seen: UPDATES.map((u) => u.id) }),
    }),
    { name: 'biblemap.updates', partialize: (s) => ({ seen: s.seen }) },
  ),
)

export function isUnseen(u: Update, seen: string[] | null, now = Date.now()): boolean {
  if (seen) return !seen.includes(u.id)
  return now - Date.parse(u.date) < FIRST_VISIT_DAYS * DAY
}

export function useUnseen(): Update[] {
  const seen = useUpdates((s) => s.seen)
  return UPDATES.filter((u) => isUnseen(u, seen))
}

/** True while a study published on `added` (YYYY-MM-DD) is still new. */
export function isNewStudy(added: string | undefined, now = Date.now()): boolean {
  return !!added && now - Date.parse(added) < NEW_STUDY_DAYS * DAY
}

/** Sep 19, or Sep 19, 2025 in another year. */
export function formatDay(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}
