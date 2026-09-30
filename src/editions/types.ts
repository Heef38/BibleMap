import type { BookMeta, RefScheme } from '@/lib/canon'

/**
 * An edition is one scripture with everything that is particular to it: its books, how its
 * references are written, its site, and the words the app uses for it. The app is built for one
 * edition at a time (`vite --mode quran`, or EDITION=quran); `@edition` points at its folder, and
 * each folder has the same files: books, site, shelves, updates, config, pages.
 */
export interface Site {
  /** The name everywhere a reader sees it. */
  name: string
  /** the prefix of this site's keys in the browser's storage */
  storage: string
  /** The public address, without a trailing slash. */
  url: string
  /** Addresses the site used to live at; opening one forwards to `url`. */
  movedFrom: string[]
  tagline: string
  /** The few words beside the logo. */
  motto: string
  /** What search results and share previews say about the site. */
  description: string
  verification: { google: string; bing: string }
  author: string
  aboutMe: string[]
  donateUrl: string
  sourceUrl: string
  /** a stylesheet of extra fonts (the Arabic face), loaded with the page */
  fonts?: string
  /**
   * false keeps the whole site out of search engines (every page asks not to be indexed, and no
   * sitemap is written): it is found only by someone who has the link.
   */
  listed: boolean
}

export interface Shelf {
  title: string
  note: string
  ids: string[]
}

export interface Update {
  id: string
  date: string
  title: string
  body: string
  link?: { to: string; label: string }
}

/** A link in the Explore list of the search pane. */
export interface ExploreLink {
  to: string
  title: string
  sub: string
}

export interface Edition {
  id: 'bible' | 'quran'
  /** the prefix of this edition's keys in the browser's storage */
  storage: string
  books: readonly BookMeta[]
  /** how references are written, when not the Bible's book, chapter and verse */
  refs?: RefScheme
  /** what a reference in running text looks like, when not "Book 3:16"; one capture group, global */
  bareRef?: RegExp
  /** the translation a first visit opens */
  translation: string
  /** the two groups every book falls in, each a row of the canon strip: the Testaments, or Mecca and Medina */
  groups: { id: string; name: string; short: string }[]
  /** the parts a connection map branches into, in canon order */
  parts: { id: string; title: string; divisions: string[] }[]
  /** the words of Jesus are marked in the text, and count three times in a study */
  redLetter: boolean
  features: { feedback: boolean; compare: boolean }
  /** the logo is the artwork in public/brand; otherwise the name is set in type beside a drawn mark */
  logoArt: boolean
  /** where the page on how the scripture is laid out lives */
  layoutPath: string
  /** Bible-Map's address, for an edition whose people and places link to their pages there */
  bibleSite?: string
  words: {
    /** "the Bible" */
    scripture: string
    /** "Bible" */
    name: string
    book: string
    books: string
    chapter: string
    chapters: string
    /** "cross references" */
    xrefs: string
  }
  /** a year of the story or of history, as a reader sees it: "1085 BC", "624 CE" */
  formatYear?: (y: number) => string
  /**
   * What years.json holds for every verse, which places passages on a study's timeline: the
   * traditional year of the story, or the order in which the surahs were revealed.
   */
  verseTime: {
    /** "year", "order of revelation" */
    unit: string
    format?: (v: number) => string
    /** under a study's timeline */
    caption: string
    /** under a person's timeline, after the name */
    mentions: string
    /** the events of the timeline data sit on this axis too */
    events: boolean
    /** periods drawn behind the rows */
    bands?: { id: string; label: string; start: number; end: number; color?: string }[]
  }
  xrefs: {
    /** where the links come from and what their bars mean, under a verse's list */
    source: string
    /** on a study map's branch of them */
    branch: string
    weight: (n: number) => string
  }
  /** what a topic's source is called, by the `source` of the topic */
  topicSources: Record<string, string>
  /** the heading over a person's or a place's dictionary entry */
  dictTitle: string
  search: {
    placeholder: string
    label: string
    suggestions: string[]
    /** a reference to try, in the help under the list */
    example: string
    explore: { chapter: ExploreLink; timeline: ExploreLink; layout: ExploreLink; compare: ExploreLink }
  }
  /** pairs offered on the compare page: two person ids and a label */
  comparePairs: [string, string, string][]
  text: {
    /** the first-visit card on the chapter view */
    welcomeTitle: string
    welcome: string
    /** under the chapter view's title once the card is put away */
    chapterHint: string
    studiesDescription: string
    studiesIntro: string
    timelineTitle: string
    timelineDescription: string
    timelineIntro: (events: number) => string
    writingsDescription: string
    writingsIntro: string
    /** the paragraphs under Notes on the credits page */
    credits: string[]
    creditsDescription: string
    creditsIntro: string
  }
}
