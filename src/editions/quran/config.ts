import type { Edition } from '../types'
import { BOOKS, SEVENTHS, seventhTitle } from './books'
import { QURAN_BARE_REF, QURAN_REFS } from './refs'
import { SITE } from './site'

/** 1st, 2nd, 3rd, 87th: a surah's place in the order of revelation. */
export function nth(n: number): string {
  const v = Math.round(n)
  const tail = v % 100
  const suffix = tail >= 11 && tail <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][v % 10] ?? 'th')
  return `${v}${suffix}`
}

/** How many surahs tradition places at Mecca: the first 86 in the order of revelation. */
export const MECCAN_SURAHS = 86

/** The Quran edition: the 114 surahs, Mecca and Medina, and the words the app uses for them. */
export const EDITION: Edition = {
  id: 'quran',
  storage: SITE.storage,
  books: BOOKS,
  refs: QURAN_REFS,
  bareRef: QURAN_BARE_REF,
  translation: 'itani',
  groups: [
    { id: 'Meccan', name: 'Meccan', short: 'Mecca' },
    { id: 'Medinan', name: 'Medinan', short: 'Medina' },
  ],
  parts: SEVENTHS.map((_, i) => ({ id: `s${i + 1}`, title: seventhTitle(i), divisions: [seventhTitle(i)] })),
  redLetter: false,
  features: { feedback: false, compare: true },
  logoArt: false,
  layoutPath: '/quran',
  bibleSite: 'https://www.bible-map.com',
  words: {
    scripture: 'the Quran',
    name: 'Quran',
    book: 'surah',
    books: 'surahs',
    chapter: 'surah',
    chapters: 'surahs',
    xrefs: 'related verses',
  },
  formatYear: (y) => `${Math.round(y)} CE`,
  verseTime: {
    unit: 'order of revelation',
    format: nth,
    caption:
      'Each row is a theme of the study; each dot is a passage, placed by where its surah falls in the traditional order of revelation (1st to 114th). What was said first at Mecca is on the left, the last words at Medina on the right. The order places whole surahs, and scholars differ on many of them.',
    mentions: 'by where their surah falls in the traditional order of revelation, from the first at Mecca to the last at Medina.',
    events: false,
    bands: [
      { id: 'mecca', label: 'Mecca, about 610 to 622', start: 0.5, end: MECCAN_SURAHS + 0.5, color: 'var(--series-1)' },
      { id: 'medina', label: 'Medina, 622 to 632', start: MECCAN_SURAHS + 0.5, end: BOOKS.length + 0.5, color: 'var(--series-2)' },
    ],
  },
  xrefs: {
    source:
      'Related verses are found by the Arabic words two verses share (their dictionary forms, from the Quranic Arabic Corpus, rarer words counting for more); the bars show how much of their wording is shared. They are computed, not a commentary.',
    branch: 'The verses that share the most of this passage’s wording in Arabic.',
    weight: (n) => `${n}% alike`,
  },
  topicSources: { word: 'a word of the Quran, from the Quranic Arabic Corpus' },
  dictTitle: 'In brief',
  search: {
    placeholder: 'Person, place, word, or 2:255',
    label: 'Search the Quran',
    suggestions: ['Moses', 'Mercy', 'Abraham', 'Paradise', 'Jesus', 'Prayer', 'Mary', 'Patience'],
    example: '2:255',
    explore: {
      chapter: { to: '/', title: 'This surah', sub: 'Where the surah you are reading connects' },
      timeline: { to: '/timeline', title: 'The years of revelation', sub: 'The life of Muhammad, and the passages tied to it' },
      layout: { to: '/quran', title: 'How the Quran is laid out', sub: 'The 114 surahs drawn to size, and the order they came in' },
      compare: { to: '/compare', title: 'Compare two people', sub: 'What two of them share, side by side' },
    },
  },
  comparePairs: [
    ['moses', 'pharaoh', 'Moses and Pharaoh'],
    ['moses', 'aaron', 'Moses and Aaron'],
    ['abraham', 'noah', 'Abraham and Noah'],
    ['jesus', 'mary', 'Jesus and Mary'],
    ['david', 'solomon', 'David and Solomon'],
  ],
  text: {
    welcomeTitle: 'See what it says, and how it connects.',
    welcome:
      'This pane follows the Quran as you read. Pick any verse to see the verses across the whole text that share its wording. Search a person, a place or a word, or open a study, and it opens here while you keep reading.',
    chapterHint: 'This pane follows the Quran. Pick any verse there to map where it connects.',
    studiesDescription: 'Studies of the Quran’s main themes, each gathering the passages on one subject and drawing them as maps and timelines.',
    studiesIntro:
      'Each study gathers the passages on one theme and draws them as maps, counts and timelines. Open one and it sits here beside the Quran; click any passage in it to read it.',
    timelineTitle: 'The years of revelation',
    timelineDescription: 'The life of Muhammad from the first revelation to his death, 610 to 632, with the passages of the Quran tradition ties to each event.',
    timelineIntro: (events) =>
      `${events} events from the traditional account of Muhammad’s life, with the passages tied to each. The Quran itself names few of them; the dates and most of the links come from the early biographies. Click an event to read its passages.`,
    writingsDescription: 'Writings on the Quran: answers to questions, with every passage behind them linked and checked against the text.',
    writingsIntro: 'Answers to questions about the Quran, each with the passages behind it. Open one and it sits here beside the Quran; its references are links.',
    credits: [
      'A translation of the Quran is one reader’s understanding of it; Muslims hold that only the Arabic is the Quran. Where translations differ, compare them: the reader switches between them on any verse.',
      'The order of revelation is the traditional one printed in the standard Egyptian edition, which places whole surahs. Many surahs hold verses from more than one time, and scholars, Muslim and Western, differ on the order; Nöldeke’s four periods are shown beside it on each surah’s page.',
      'People, places and word lists are read off the Arabic: every verse where the Quranic Arabic Corpus tags the name or the word. A person who is meant but not named in a verse is not counted there.',
      'Related verses are computed from shared Arabic vocabulary. Studies, surah summaries, section headings and the notes on people and places are written for this project and carry the judgement of their author; every reference in them was checked against the text.',
      'The years of Muhammad’s life come from the early Muslim biographies, not from the Quran, which names very few events.',
    ],
    creditsDescription: 'The open data behind Quran-Map: the Arabic text, translations, word-by-word grammar and surah data, each with its license.',
    creditsIntro: 'Quran-Map is built on open data; each source keeps its own license.',
  },
}
