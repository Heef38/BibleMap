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
  /**
   * What Bible-Map is for, the first section of the About page. DRAFT: written 2026-10-22 from the
   * owner's brief and not yet approved by them.
   */
  purpose: [
    'Bible-Map is here to help people see how the Bible fits together. Its sixty-six books were written by many people over many centuries, yet they tell one story about one God, and that story keeps pointing to Jesus.',
    'It is for believers at every stage. If you are just starting, it shows you where to begin and how the pieces connect. If you have read the Bible for years, it shows you the patterns that run from Genesis to Revelation. If you study it closely, the detail is here too: every reference, names in Hebrew and Greek, and the threads between the Testaments. Wherever you start, the aim is the same: to know God better and to grow in following him.',
    'It is just as much for anyone who doesn’t believe, or isn’t sure. You are welcome here. We hope you will see what we see: a book that holds together across the centuries, and a story that leads to a person. You don’t have to take our word for it. Every connection on the map points back to the text, so you can read it and judge for yourself.',
    'Bible-Map doesn’t replace reading the Bible, a church, or the people who walk with you. It is a map. It shows you where things are, so you can go and read them for yourself.',
  ],
  /** The verse that closes that section, quoted from the Berean Standard Bible. */
  purposeVerse: {
    text: 'These are written so that you may believe that Jesus is the Christ, the Son of God, and that by believing you may have life in His name.',
    ref: 'John 20:31',
  },
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
