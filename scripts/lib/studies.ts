/**
 * Compiles the hand-authored studies (YAML) and writings (Markdown) into resolved JSON. Every
 * edition's data build uses it; what differs between them (whose words count three times, which
 * views can be derived from the references) is passed in.
 */
import fs from 'node:fs'
import path from 'node:path'
import { load as loadYaml } from 'js-yaml'
import type { Canon } from '../../src/lib/canon'
import { countVerses, mergeRanges, parseRefs, type Range } from '../../src/lib/refs'

const readText = (p: string) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export interface StudyLinkYaml {
  to: string
  topic?: string
  note?: string
  category?: string
  label?: string
}
export interface StudyRefYaml {
  ref: string
  note?: string
  label?: string
  weight?: number
  /** connection studies: the passage this reference points to */
  to?: string
  category?: string
  /** further passages this reference connects to, each with the theme of the connection */
  links?: StudyLinkYaml[]
  /** tags on the study's facets, e.g. { initiative: brought, means: [touch, word] } */
  facets?: Record<string, string | string[]>
  /** in an edition that is not the Bible: where the Bible tells the same thing, e.g. "Gen 22:1-19" */
  bible?: string
}
export interface StudyGroupYaml {
  id?: string
  title: string
  note?: string
  weight?: number
  refs: (string | StudyRefYaml)[]
}
export interface StudyViewYaml {
  id?: string
  title: string
  note?: string
  groups?: StudyGroupYaml[]
  /**
   * Derive the groups from every reference in the authored views: by `category` or by a `facet`
   * in any edition, and in the ways an edition adds (the Bible's `book`, `testament` and `jesus`).
   */
  auto?: string
  /** with auto: facet, the facet whose values become the groups */
  facet?: string
}
export interface StudyFacetYaml {
  title: string
  note?: string
  values: Record<string, StudyCategoryYaml>
}
export interface StudyCategoryYaml {
  title: string
  note?: string
  /** on the triangle's facet: where the value sits, at a corner id, 'center' (God is one) or 'all' (all three together) ... */
  at?: string
  /** ... or on the side between two corners, drawn from one toward the other */
  from?: string
  to?: string
}
export interface TriangleYaml {
  /** the facet whose values place each passage on the triangle */
  facet: string
  corners: { id: string; title: string; short?: string; note?: string }[]
  center: { title: string; short?: string; note?: string }
}
export interface StudyYaml {
  id: string
  title: string
  subtitle?: string
  summary?: string
  tags?: string[]
  /** the day the study was published (YYYY-MM-DD); it is marked New for a while after */
  added?: string
  kind?: string
  chart?: string
  timeline?: { from?: number; to?: number; note?: string }
  categories?: Record<string, StudyCategoryYaml>
  /** Ways to sort the same passages (who started it, how it was done), counted on the Patterns chart. */
  facets?: Record<string, StudyFacetYaml>
  /** What the Patterns chart calls one tagged passage, in the plural: events, accounts, promises. */
  facetUnit?: string
  /** Draw the study as a triangle of three corners with a center (the Trinity study). */
  triangle?: TriangleYaml
  views: StudyViewYaml[]
}
export interface StudyLink {
  ranges: Range[]
  label: string
  topic?: string
  note?: string
  category?: string
  jesus: boolean
}
export interface StudyRef {
  label: string
  ranges: Range[]
  verses: number
  weight: number
  /** Jesus's words are in the passage itself or in one of its links */
  jesus: boolean
  /** Jesus's words are in the passage itself */
  jesusOwn?: boolean
  note?: string
  to?: Range[]
  toLabel?: string
  category?: string
  links?: StudyLink[]
  facets?: Record<string, string[]>
  /** the parallel passages in the Bible, each with the id Bible-Map opens it by */
  bible?: { label: string; osis: string }[]
}
export interface StudyGroup {
  id: string
  title: string
  note?: string
  refs: StudyRef[]
  weight: number
  verses: number
}
export interface StudyView {
  id: string
  title: string
  note?: string
  groups: StudyGroup[]
}
export interface StudyJson {
  id: string
  title: string
  subtitle?: string
  summary?: string
  tags: string[]
  added?: string
  kind?: string
  chart?: string
  timeline?: { from?: number; to?: number; note?: string }
  categories?: { id: string; title: string; note?: string }[]
  facets?: { id: string; title: string; note?: string; values: { id: string; title: string; note?: string; at?: string; from?: string; to?: string }[] }[]
  facetUnit?: string
  triangle?: TriangleYaml
  views: StudyView[]
  ranges: Range[]
  refCount: number
  verseCount: number
}

export type Bucket = (title: string, refs: StudyRef[], note?: string) => StudyGroup

export interface StudyBuild {
  canon: Canon
  /** the folder of *.yaml studies */
  dir: string
  /** the words of Jesus are in these verses: such a reference counts three times (the Bible) */
  jesusSpeaksIn?: (ranges: Range[]) => boolean
  /** an edition's own derived views: the groups for an `auto:` it knows, from every reference in canon order */
  autoGroups?: (auto: string, allRefs: StudyRef[], bucket: Bucket) => StudyGroup[] | undefined
  /** the Bible's verse grid, for an edition whose studies point at parallels in the Bible */
  bible?: Canon
  warn: (...a: unknown[]) => void
}

/** Every study in the folder, resolved: references parsed and checked, links shared, derived views filled in. */
export function compileStudies(build: StudyBuild): StudyJson[] {
  const { canon } = build
  const jesusSpeaksIn = build.jesusSpeaksIn ?? (() => false)
  const studies: StudyJson[] = []
  if (fs.existsSync(build.dir)) {
    for (const file of fs.readdirSync(build.dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      const doc = loadYaml(readText(path.join(build.dir, file))) as StudyYaml
      if (!doc?.id || !doc.title || !Array.isArray(doc.views)) throw new Error(`${file}: needs id, title and views`)
      // js-yaml reads an unquoted date as a Date; keep it as the plain day either way.
      const added = (doc.added as unknown) instanceof Date ? (doc.added as unknown as Date).toISOString().slice(0, 10) : doc.added
      if (added !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(added)) throw new Error(`${file}: added must be a date like 2026-09-19`)
      if (doc.triangle) {
        const t = doc.triangle
        const facet = doc.facets?.[t.facet]
        if (!facet) throw new Error(`${file}: triangle.facet "${t.facet}" is not a facet`)
        if (t.corners?.length !== 3) throw new Error(`${file}: a triangle needs three corners`)
        const ids = new Set(t.corners.map((c) => c.id))
        for (const [vid, v] of Object.entries(facet.values)) {
          const placed = v.at !== undefined ? ids.has(v.at) || v.at === 'center' || v.at === 'all' : !!v.from && !!v.to && ids.has(v.from) && ids.has(v.to) && v.from !== v.to
          if (!placed) throw new Error(`${file}: triangle value "${vid}" needs at (a corner, center or all) or from/to (two corners)`)
        }
      }
      const all: Range[] = []
      let refCount = 0
      const compileGroup = (g: StudyGroupYaml): StudyGroup => {
        const refs: StudyRef[] = g.refs.map((item) => {
          const r: StudyRefYaml = typeof item === 'string' ? { ref: item } : item
          const parsed = parseRefs(r.ref, canon)
          for (const err of parsed.errors) build.warn(`${file} › ${g.title}: ${err}`)
          if (!parsed.ranges.length) throw new Error(`${file} › ${g.title}: could not parse "${r.ref}"`)
          const ranges = parsed.ranges
          let to: Range[] | undefined
          if (r.to) {
            const parsedTo = parseRefs(r.to, canon)
            for (const err of parsedTo.errors) build.warn(`${file} › ${g.title}: ${err}`)
            if (!parsedTo.ranges.length) throw new Error(`${file} › ${g.title}: could not parse "${r.to}"`)
            to = parsedTo.ranges
          }
          if (r.category && doc.categories && !doc.categories[r.category]) throw new Error(`${file} › ${g.title}: unknown category "${r.category}"`)
          const links: StudyLink[] = []
          if (to) links.push({ ranges: to, label: to.map((x) => canon.rangeLabel(x[0], x[1])).join('; '), category: r.category, jesus: jesusSpeaksIn(to) })
          for (const l of r.links ?? []) {
            const parsedL = parseRefs(l.to, canon)
            for (const err of parsedL.errors) build.warn(`${file} › ${g.title} › ${r.ref}: ${err}`)
            if (!parsedL.ranges.length) throw new Error(`${file} › ${g.title} › ${r.ref}: could not parse link "${l.to}"`)
            if (l.category && doc.categories && !doc.categories[l.category]) throw new Error(`${file} › ${g.title} › ${r.ref}: unknown link category "${l.category}"`)
            links.push({
              ranges: parsedL.ranges,
              label: l.label ?? parsedL.ranges.map((x) => canon.rangeLabel(x[0], x[1])).join('; '),
              topic: l.topic,
              note: l.note,
              category: l.category,
              jesus: jesusSpeaksIn(parsedL.ranges),
            })
          }
          let facets: Record<string, string[]> | undefined
          for (const [fid, raw] of Object.entries(r.facets ?? {})) {
            const facet = doc.facets?.[fid]
            if (!facet) throw new Error(`${file} › ${g.title} › ${r.ref}: unknown facet "${fid}"`)
            const vals = (Array.isArray(raw) ? raw : [raw]).map(String)
            for (const v of vals) if (!facet.values[v]) throw new Error(`${file} › ${g.title} › ${r.ref}: facet "${fid}" has no value "${v}"`)
            ;(facets ??= {})[fid] = vals
          }
          let bible: StudyRef['bible']
          if (r.bible) {
            const grid = build.bible
            if (!grid) throw new Error(`${file} › ${g.title} › ${r.ref}: this edition has no Bible to point at`)
            const parsedB = parseRefs(r.bible, grid)
            if (!parsedB.ranges.length || parsedB.errors.length) throw new Error(`${file} › ${g.title} › ${r.ref}: could not parse the Bible passage "${r.bible}"`)
            bible = parsedB.ranges.map(([a, z]) => ({ label: grid.rangeLabel(a, z), osis: grid.osis(a) }))
          }
          const jesusOwn = jesusSpeaksIn(ranges)
          const jesus = jesusOwn || links.some((l) => l.jesus)
          const weight = r.weight ?? g.weight ?? (jesus ? 3 : 1)
          all.push(...ranges)
          for (const l of links) all.push(...l.ranges)
          refCount++
          return {
            label: r.label ?? ranges.map((x) => canon.rangeLabel(x[0], x[1])).join('; '),
            ranges,
            verses: countVerses(ranges),
            weight,
            jesus,
            jesusOwn: jesusOwn || undefined,
            note: r.note,
            to,
            toLabel: to ? to.map((x) => canon.rangeLabel(x[0], x[1])).join('; ') : undefined,
            category: r.category,
            links: links.length ? links : undefined,
            facets,
            bible,
          }
        })
        return {
          id: g.id ?? slugify(g.title),
          title: g.title,
          note: g.note,
          refs,
          weight: refs.reduce((s, r) => s + r.weight, 0),
          verses: countVerses(mergeRanges(refs.flatMap((r) => r.ranges))),
        }
      }
      const authored: StudyView[] = doc.views
        .filter((v) => !v.auto)
        .map((v) => ({ id: v.id ?? slugify(v.title), title: v.title, note: v.note, groups: (v.groups ?? []).map(compileGroup) }))
      // A passage that appears in several views shares its links (and note) everywhere.
      const linksByKey = new Map<string, StudyLink[]>()
      const noteByKey = new Map<string, string>()
      const facetsByKey = new Map<string, Record<string, string[]>>()
      for (const v of authored) for (const g of v.groups) for (const r of g.refs) {
        const k = JSON.stringify(r.ranges)
        const list = linksByKey.get(k) ?? linksByKey.set(k, []).get(k)!
        for (const l of r.links ?? []) if (!list.some((x) => x.label === l.label && x.topic === l.topic)) list.push(l)
        if (r.note && !noteByKey.has(k)) noteByKey.set(k, r.note)
        if (r.facets) facetsByKey.set(k, { ...r.facets, ...facetsByKey.get(k) })
      }
      for (const v of authored) for (const g of v.groups) for (const r of g.refs) {
        const k = JSON.stringify(r.ranges)
        const list = linksByKey.get(k)
        if (list?.length) {
          r.links = list
          if (list.some((l) => l.jesus) && !r.jesus) {
            r.jesus = true
            r.weight = Math.max(r.weight, 3)
          }
        }
        if (!r.note && noteByKey.has(k)) r.note = noteByKey.get(k)
        if (facetsByKey.has(k)) r.facets = facetsByKey.get(k)
        for (const l of r.links ?? []) all.push(...l.ranges)
      }
      for (const v of authored) for (const g of v.groups) {
        g.weight = g.refs.reduce((s, r) => s + r.weight, 0)
        g.verses = countVerses(mergeRanges(g.refs.flatMap((r) => r.ranges)))
      }
      // Every distinct reference across the authored views, in canonical order.
      const distinct = new Map<string, StudyRef>()
      for (const v of authored) for (const g of v.groups) for (const r of g.refs) {
        const k = JSON.stringify(r.ranges)
        if (!distinct.has(k)) distinct.set(k, { ...r })
      }
      const allRefs = [...distinct.values()].sort((a, b) => a.ranges[0][0] - b.ranges[0][0])
      const bucket = (title: string, refs: StudyRef[], note?: string): StudyGroup => ({
        id: slugify(title),
        title,
        note,
        refs,
        weight: refs.reduce((s, r) => s + r.weight, 0),
        verses: countVerses(mergeRanges(refs.flatMap((r) => r.ranges))),
      })
      const autoView = (v: StudyViewYaml): StudyView => {
        let groups: StudyGroup[] = []
        if (v.auto === 'category') {
          const cats = Object.entries(doc.categories ?? {})
          const linkCats = allRefs.some((r) => r.links?.some((l) => l.category))
          if (linkCats) {
            // Categories live on the links: a passage appears under every kind of connection it has,
            // carrying only the links of that kind.
            groups = cats
              .map(([id, c]) =>
                bucket(
                  c.title,
                  allRefs.flatMap((r) => {
                    const mine = (r.links ?? []).filter((l) => (l.category ?? r.category) === id)
                    if (!mine.length && r.category !== id) return []
                    const jesus = !!r.jesusOwn || mine.some((l) => l.jesus)
                    return [{ ...r, links: mine.length ? mine : undefined, jesus, weight: jesus ? Math.max(r.weight, 3) : Math.min(r.weight, 1) }]
                  }),
                ),
              )
              .filter((g) => g.refs.length)
            const rest = allRefs.filter((r) => !r.category && !(r.links ?? []).some((l) => l.category))
            if (rest.length) groups.push(bucket('Uncategorized', rest))
          } else {
            groups = cats.map(([id, c]) => bucket(c.title, allRefs.filter((r) => r.category === id))).filter((g) => g.refs.length)
            const rest = allRefs.filter((r) => !r.category || !doc.categories?.[r.category])
            if (rest.length) groups.push(bucket('Uncategorized', rest))
          }
        } else if (v.auto === 'facet') {
          // One group per value; a passage with several values sits in each of them.
          const facet = v.facet ? doc.facets?.[v.facet] : undefined
          if (!facet) throw new Error(`${file} › ${v.title}: auto facet needs a known facet, got "${v.facet}"`)
          groups = Object.entries(facet.values)
            .map(([id, val]) => bucket(val.title, allRefs.filter((r) => r.facets?.[v.facet!]?.includes(id)), val.note))
            .filter((g) => g.refs.length)
        } else if (v.auto) {
          const own = build.autoGroups?.(v.auto, allRefs, bucket)
          if (!own) throw new Error(`${file} › ${v.title}: no derived view is called "${v.auto}"`)
          groups = own
        }
        return { id: v.id ?? slugify(v.title), title: v.title, note: v.note, groups }
      }
      const views: StudyView[] = doc.views.map((v) => (v.auto ? autoView(v) : authored.find((a) => a.id === (v.id ?? slugify(v.title)))!))
      const merged = mergeRanges(all)
      const study: StudyJson = {
        id: doc.id,
        title: doc.title,
        subtitle: doc.subtitle,
        summary: doc.summary,
        tags: doc.tags ?? [],
        added,
        kind: doc.kind,
        chart: doc.chart,
        timeline: doc.timeline,
        categories: doc.categories ? Object.entries(doc.categories).map(([id, c]) => ({ id, title: c.title, note: c.note })) : undefined,
        facets: doc.facets
          ? Object.entries(doc.facets).map(([id, f]) => ({
              id,
              title: f.title,
              note: f.note,
              values: Object.entries(f.values).map(([vid, val]) => ({ id: vid, title: val.title, note: val.note, at: val.at, from: val.from, to: val.to })),
            }))
          : undefined,
        facetUnit: doc.facetUnit,
        triangle: doc.triangle,
        views,
        ranges: merged,
        refCount,
        verseCount: countVerses(merged),
      }
      studies.push(study)
    }
  }
  return studies
}

export interface WritingYaml {
  title: string
  question?: string
  author: string
  authorNote?: string
  askedBy?: string
  date: string
  summary?: string
  note?: string
  passages?: { ref: string; label: string }[]
}
export interface WritingIndexRow {
  id: string
  title: string
  summary?: string
  author: string
  date: string
}
export interface WritingJson extends Omit<WritingYaml, 'passages'> {
  id: string
  passages: { label: string; ref: string; ranges: Range[] }[]
  body: string[]
}

/**
 * Writings: *.md files, a YAML header between two lines of dashes and the text after it, one
 * paragraph per blank line. The passages in the header are checked and turned into ranges.
 */
export function compileWritings(dir: string, canon: Canon): { index: WritingIndexRow[]; docs: WritingJson[] } {
  const index: WritingIndexRow[] = []
  const docs: WritingJson[] = []
  if (!fs.existsSync(dir)) return { index, docs }
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const id = file.replace(/\.md$/, '')
    const raw = readText(path.join(dir, file)).replace(/\r\n/g, '\n')
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw)
    if (!m) throw new Error(`${file}: needs a YAML header between two lines of ---`)
    const head = loadYaml(m[1]) as WritingYaml
    if (!head?.title || !head.author || !head.date) throw new Error(`${file}: needs title, author and date`)
    const date = (head.date as unknown) instanceof Date ? (head.date as unknown as Date).toISOString().slice(0, 10) : String(head.date)
    const passages = (head.passages ?? []).map((pg) => {
      const parsed = parseRefs(pg.ref, canon)
      if (!parsed.ranges.length || parsed.errors.length) throw new Error(`${file}: could not parse passage "${pg.ref}"`)
      return { label: pg.label, ref: parsed.ranges.map(([a, z]) => canon.rangeLabel(a, z)).join('; '), ranges: parsed.ranges }
    })
    const body = m[2].split(/\n\s*\n/).map((pgh) => pgh.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
    docs.push({ id, ...head, date, passages, body })
    index.push({ id, title: head.title, summary: head.summary, author: head.author, date })
  }
  index.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
  return { index, docs }
}
