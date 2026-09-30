import type { Shelf } from '../types'

/**
 * The shelves on the Studies page, in order. A study not listed here lands on the last shelf,
 * so a new study shows up before anyone files it.
 */
export const SHELVES: Shelf[] = [
  {
    title: 'Start here',
    note: 'The main themes of the Quran in its own words, each pointing to the study that follows it through the whole book.',
    ids: ['main-themes'],
  },
  {
    title: 'God and His word',
    note: 'Who God is in the Quran, what the Quran says of itself, the signs in creation, and the unseen world.',
    ids: ['god-in-the-quran', 'the-quran-about-itself', 'signs-in-creation', 'angels-jinn-and-satan'],
  },
  {
    title: 'The prophets',
    note: 'Adam to Jesus as the Quran tells them, beside the Bible; and Muhammad, the last.',
    ids: ['the-prophets', 'jesus-and-mary', 'muhammad'],
  },
  {
    title: 'Judgment and salvation',
    note: 'The Last Day, the Garden and the Fire, and what the Quran says a person is saved by.',
    ids: ['the-last-day', 'sin-and-salvation'],
  },
  {
    title: 'Living by the Quran',
    note: 'Worship, law, family, and the kinds of people the Quran sorts its hearers into.',
    ids: ['worship', 'the-law', 'women-and-family', 'believers-and-unbelievers'],
  },
  {
    title: 'Islam and others',
    note: 'What the Quran says of Jews and Christians, and of war and peace.',
    ids: ['people-of-the-book', 'fighting-and-peace'],
  },
]

export const OTHER_SHELF = { title: 'More studies', note: '' }
