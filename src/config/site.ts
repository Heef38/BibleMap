/**
 * The site's name and address, who runs it and where support goes. Edit this file to change the
 * About page, the owner's name on replies, the Donate button, and what search engines are told.
 */
export const SITE = {
  /** The name everywhere a reader sees it (the logo spells it BIBLE-MAP). */
  name: 'Bible-Map',
  /**
   * The public address, without a trailing slash. Search engines, share previews and the sitemap
   * use it; after changing it (a custom domain, say), run `pnpm data:build` to rewrite the sitemap.
   */
  url: 'https://www.bible-map.com',
  /**
   * Addresses the site used to live at. Opening one forwards to `url`, carrying the reader's
   * settings and notes along (browsers keep them per address), and search engines are asked not
   * to list them.
   */
  movedFrom: ['https://biblemap-mauve.vercel.app'],
  tagline: 'See how the story of the Bible connects',
  /** What search results and share previews say about the site. */
  description:
    'A free, interactive map of the Bible: search any person, place or theme and see every reference across Scripture, with guided studies, timelines and connection maps, and the Bible open beside it.',
  /**
   * Codes from Google Search Console and Bing Webmaster Tools ("HTML tag" method), so they can
   * confirm you own the site. Leave empty until you have them.
   */
  verification: { google: '', bing: '' },
  author: 'Heath',
  /** A few short paragraphs about you, shown on the About page. */
  aboutMe: [
    'Hi, I’m Heath. I’m building Bible-Map so that anyone can see how the whole Bible fits together: the people and places, the themes that run from Genesis to Revelation, and the many ways the Old Testament points to Jesus.',
    'It started as a tool for my own study. I’m opening it up in the hope that it helps you study too.',
  ],
  /**
   * Your donation page: Ko-fi, Buy Me a Coffee, a PayPal donate link, a Stripe Payment Link, and so on.
   * The Donate buttons appear once this is set.
   */
  donateUrl: '',
  sourceUrl: 'https://github.com/Heef38/BibleMap',
}
