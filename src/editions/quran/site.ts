import type { Site } from '../types.ts'

/**
 * The Quran edition's site. It is not listed: every page asks search engines to stay away and no
 * sitemap is written, so it is found only by someone who has been given the link.
 */
export const SITE: Site = {
  name: 'Quran-Map',
  storage: 'quranmap',
  /** The address it is served from, without a trailing slash, once it has one. Nothing is published from it while the site is unlisted. */
  url: '',
  movedFrom: [],
  tagline: 'See what the Quran says, and how it connects',
  motto: 'see what it says, and how it connects',
  description:
    'A study map of the Quran: read it in several translations beside the Arabic, search any person, place or word and see every verse, and follow its main themes through guided studies, timelines and connection maps.',
  verification: { google: '', bing: '' },
  author: 'Heath',
  aboutMe: [],
  donateUrl: '',
  sourceUrl: '',
  fonts: 'https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap',
  listed: false,
}
