/**
 * A small, careful USFM parser: enough to extract clean verse text, the spans
 * marked as words of Jesus (\wj), and section headings from the BSB and WEB files.
 * Footnotes, cross-reference notes, figures and word attributes are dropped.
 */
export interface UsfmVerse {
  c: number
  v: number
  text: string
  /** [start, end) character ranges of Jesus' words inside `text` */
  wj: [number, number][]
}

export interface UsfmBook {
  code: string
  verses: UsfmVerse[]
  /** "chapter:verse" -> heading shown before that verse */
  headings: Map<string, string>
}

const LINE_DISCARD = new Set([
  'id', 'ide', 'h', 'h1', 'h2', 'h3', 'toc1', 'toc2', 'toc3', 'toca1', 'toca2', 'toca3',
  'mt', 'mt1', 'mt2', 'mt3', 'mt4', 'mte', 'mte1', 'mte2', 'r', 'sr', 'mr', 'rem', 'sts', 'usfm',
  'cl', 'cp', 'cd', 'sp', 'ie', 'is', 'is1', 'is2', 'ip', 'ipi', 'im', 'imi', 'ipq', 'imq', 'ipr',
  'iq', 'iq1', 'iq2', 'iq3', 'ib', 'ili', 'ili1', 'ili2', 'iot', 'io', 'io1', 'io2', 'io3', 'io4',
  'iex', 'imte', 'periph', 'restore', 'lit',
])
const LINE_HEADING = new Set(['s', 's1', 's2', 's3', 's4', 'ms', 'ms1', 'ms2', 'ms3'])
const PARAGRAPH = new Set([
  'p', 'm', 'po', 'pr', 'cls', 'pmo', 'pm', 'pmc', 'pmr', 'pi', 'pi1', 'pi2', 'pi3', 'mi', 'nb', 'pc',
  'ph', 'ph1', 'ph2', 'ph3', 'b', 'q', 'q1', 'q2', 'q3', 'q4', 'qr', 'qc', 'qa', 'qm', 'qm1', 'qm2', 'qm3',
  'qd', 'lh', 'lf', 'li', 'li1', 'li2', 'li3', 'li4', 'lim', 'lim1', 'lim2', 'tr', 'th1', 'th2', 'th3',
  'th4', 'thr1', 'thr2', 'thr3', 'thr4', 'tc1', 'tc2', 'tc3', 'tc4', 'tcr1', 'tcr2', 'tcr3', 'tcr4',
  'd', 'sd', 'sd1', 'sd2', 'sd3', 'sd4',
])
/** Character-level markers whose whole content is dropped. */
const CHAR_SKIP = new Set(['f', 'fe', 'x', 'fig', 'va', 'vp', 'rq', 'ndx', 'ef', 'ex', 'fm', 'cat'])

const MARK = /\\(\+?[a-zA-Z]+[0-9]*)(\*?)/y

export function parseUsfm(source: string): UsfmBook {
  const s = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const verses: UsfmVerse[] = []
  const headings = new Map<string, string>()
  let code = ''
  let chapter = 0
  let cur: UsfmVerse | null = null
  let pendingHeading: string[] = []
  let skipDepth = 0
  const charStack: string[] = []
  let inAttrs = false
  let wjOpen = false
  let wjStart = -1

  const append = (raw: string) => {
    if (!cur || skipDepth > 0 || inAttrs) return
    let chunk = raw
    if (charStack[charStack.length - 1] === 'w') {
      const bar = chunk.indexOf('|')
      if (bar >= 0) {
        chunk = chunk.slice(0, bar)
        inAttrs = true
      }
    }
    let t = chunk.replace(/\s+/g, ' ')
    if (t.startsWith(' ') && (cur.text === '' || cur.text.endsWith(' '))) t = t.slice(1)
    cur.text += t
  }

  const closeWj = () => {
    if (cur && wjStart >= 0 && cur.text.length > wjStart) cur.wj.push([wjStart, cur.text.length])
    wjStart = -1
  }

  const flush = () => {
    if (!cur) return
    if (wjOpen) closeWj()
    const trimmed = cur.text.replace(/\s+$/, '')
    const cut = trimmed.length
    cur.text = trimmed
    cur.wj = cur.wj
      .map(([a, b]) => [Math.min(a, cut), Math.min(b, cut)] as [number, number])
      .filter(([a, b]) => b > a)
    verses.push(cur)
    cur = null
  }

  const startVerse = (v: number) => {
    flush()
    cur = { c: chapter, v, text: '', wj: [] }
    if (wjOpen) wjStart = 0
    if (pendingHeading.length) {
      headings.set(`${chapter}:${v}`, pendingHeading.join(' · '))
      pendingHeading = []
    }
  }

  const lineContent = (from: number): [string, number] => {
    const nl = s.indexOf('\n', from)
    const end = nl < 0 ? s.length : nl
    return [s.slice(from, end), end]
  }

  let i = 0
  while (i < s.length) {
    const bs = s.indexOf('\\', i)
    if (bs < 0) {
      append(s.slice(i))
      break
    }
    if (bs > i) append(s.slice(i, bs))
    MARK.lastIndex = bs
    const m = MARK.exec(s)
    if (!m) {
      append('\\')
      i = bs + 1
      continue
    }
    const name = m[1]
    const closing = m[2] === '*'
    i = bs + m[0].length
    if (!closing && s[i] === ' ') i++
    const base = name.startsWith('+') ? name.slice(1) : name

    if (skipDepth > 0) {
      if (closing && CHAR_SKIP.has(base)) skipDepth--
      else if (!closing && CHAR_SKIP.has(base)) skipDepth++
      else if (!closing && (base === 'v' || base === 'c')) skipDepth = 0
      if (skipDepth > 0) continue
      if (closing) continue
    }

    if (closing) {
      if (base === 'wj') {
        closeWj()
        wjOpen = false
      } else if (base === 'w') {
        inAttrs = false
      }
      const idx = charStack.lastIndexOf(base)
      if (idx >= 0) charStack.splice(idx, 1)
      continue
    }

    if (base === 'id') {
      const [content, end] = lineContent(i)
      code = content.trim().split(/\s+/)[0] ?? ''
      i = end
      continue
    }
    if (base === 'c') {
      flush()
      const [content, end] = lineContent(i)
      chapter = parseInt(content.trim(), 10) || chapter + 1
      i = end
      continue
    }
    if (base === 'v') {
      const vm = /^(\d+)[a-z]?(?:\s*[-–]\s*(\d+)[a-z]?)?\s*/.exec(s.slice(i, i + 16))
      if (vm) {
        i += vm[0].length
        startVerse(parseInt(vm[1], 10))
        if (vm[2]) {
          // A verse bridge like \v 12-13: the text belongs to the first verse; later ones stay empty.
          const last = parseInt(vm[2], 10)
          const first = parseInt(vm[1], 10)
          for (let extra = first + 1; extra <= last; extra++) verses.push({ c: chapter, v: extra, text: '', wj: [] })
        }
      }
      continue
    }
    if (LINE_HEADING.has(base)) {
      const [content, end] = lineContent(i)
      const clean = content.replace(/\\\+?[a-zA-Z]+[0-9]*\*?/g, '').replace(/\|[^\\]*/g, '').replace(/\s+/g, ' ').trim()
      if (clean) pendingHeading.push(clean)
      i = end
      continue
    }
    if (LINE_DISCARD.has(base)) {
      const [, end] = lineContent(i)
      i = end
      continue
    }
    if (PARAGRAPH.has(base)) {
      append(' ')
      continue
    }
    if (CHAR_SKIP.has(base)) {
      skipDepth = 1
      continue
    }
    // Any other character-level marker: keep its text.
    if (base === 'wj') {
      wjOpen = true
      const active = cur as UsfmVerse | null
      wjStart = active ? active.text.length : 0
    } else if (base === 'w') {
      inAttrs = false
    }
    charStack.push(base)
  }
  flush()
  return { code, verses, headings }
}
