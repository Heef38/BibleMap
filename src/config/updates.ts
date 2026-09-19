/**
 * What's new in BibleMap, newest first. Add an entry whenever a study or feature ships: readers
 * see a dot on the header's What's new button until they open it. Give every entry an id that
 * never changes, and a date (YYYY-MM-DD). New studies also get `added:` in their YAML, which
 * marks them New in the study lists for a month.
 */
export interface Update {
  id: string
  date: string
  title: string
  body: string
  link?: { to: string; label: string }
}

export const UPDATES: Update[] = [
  {
    id: 'mobile-bible-split',
    date: '2026-09-19',
    title: 'Read and study side by side on a phone',
    body: 'Tap the book at the top to keep the Bible open under the map or search. Drag the bar between them to give either one more room.',
  },
  {
    id: 'study-miracles',
    date: '2026-09-19',
    title: 'New study: The Miracles and Healings of Jesus',
    body: 'Thirty-five miracles and how they happened: who came to whom, when Jesus spoke to the sickness and when to the person, when he touched, and whose faith is named. The Patterns chart counts them.',
    link: { to: '/study/miracles-of-jesus', label: 'Open the study' },
  },
  {
    id: 'study-presence',
    date: '2026-09-19',
    title: 'New study: The Presence of God',
    body: 'What his presence is like, how his people sought it, how it comes to live in us, and how Jesus walked with the Father.',
    link: { to: '/study/presence-of-god', label: 'Open the study' },
  },
  {
    id: 'back-forward',
    date: '2026-09-19',
    title: 'Back and Forward keep your place',
    body: 'Every jump in the reader is now a step you can go back to, with the arrows at the top or your browser’s own.',
  },
  {
    id: 'feedback-board',
    date: '2026-09-18',
    title: 'Share ideas on the feedback board',
    body: 'Post an idea, a problem or a correction without an account, and upvote the ones you want most.',
    link: { to: '/feedback', label: 'Open the feedback board' },
  },
]
