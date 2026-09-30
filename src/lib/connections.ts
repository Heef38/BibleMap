import { EDITION } from '@edition/config'
import type { Canon } from './canon'
import type { StudyIndexEntry, XrefTable } from '@/data/types'

/** The parts of the scripture a connection map branches into, in canon order. */
export const PARTS = EDITION.parts

export const partColor = (i: number) => `var(--series-${i + 1})`

const PART_OF = new Map(PARTS.flatMap((p, i) => p.divisions.map((d) => [d, i] as const)))

/** Which of PARTS a verse sits in. */
export function partOf(canon: Canon, o: number): number {
  return PART_OF.get(canon.book(canon.locate(o).b).division) ?? 0
}

export interface Xref {
  /** the verse the link starts from */
  from: number
  start: number
  end: number
  votes: number
}

/** Every cross reference leaving the verses start..end, strongest first. */
export function xrefsFrom(table: XrefTable, start: number, end: number): Xref[] {
  const out: Xref[] = []
  for (let o = start; o <= end; o++) for (const [s, e, votes] of table[o] ?? []) out.push({ from: o, start: s, end: e, votes })
  return out.sort((a, b) => b.votes - a.votes)
}

/** The studies whose passages touch start..end. */
export function studiesTouching(studies: StudyIndexEntry[], start: number, end: number): StudyIndexEntry[] {
  return studies.filter((s) => s.ranges?.some(([a, z]) => a <= end && z >= start))
}
