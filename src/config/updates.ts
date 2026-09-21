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
    id: 'study-trinity',
    date: '2026-09-21',
    title: 'New study: The Trinity, with a triangle chart',
    body: 'One God, and the Father, the Son and the Holy Spirit. A new triangle chart draws how each relates to the others: who sends, gives, loves, glorifies and prays to whom, with the passages where all three act at once around the center.',
    link: { to: '/study/trinity', label: 'Open the study' },
  },
  {
    id: 'study-isaiah',
    date: '2026-09-21',
    title: 'New study: The Book of Isaiah',
    body: 'The book in its eight movements and by its great themes, with every passage tagged by who it was spoken to and when it comes true (in Isaiah\'s day, in the return from Babylon, in Christ, in the church, or still to come), and linked to where the rest of the Bible picks it up.',
    link: { to: '/study/isaiah', label: 'Open the study' },
  },
  {
    id: 'map-clicks',
    date: '2026-09-21',
    title: 'Maps that go where you click',
    body: 'Hover anything on a map to see what it is; click it and it goes straight there. A branch zooms in, a dot follows its link, and the center steps back. On a phone, links in Explore now open on the Map tab.',
  },
  {
    id: 'layout-bible-center',
    date: '2026-09-21',
    title: 'The Bible in the middle, with maps beside it',
    body: 'The Bible now sits in the center and everything else opens beside it. Click any verse to see a map of where it connects across the Bible. At rest, the right pane maps the chapter you are reading. Studies have their own page, sorted by theme, and there is a place for notes under the search.',
    link: { to: '/studies', label: 'Browse the studies' },
  },
  {
    id: 'study-promises',
    date: '2026-09-19',
    title: 'New study: The Promises of God',
    body: 'Eighty-two promises by what they promise, with the covenants behind them. Each is tagged with who it was made to, whether a condition is attached, and when it is kept, and the Patterns chart counts them.',
    link: { to: '/study/promises-of-god', label: 'Open the study' },
  },
  {
    id: 'coming-soon',
    date: '2026-09-19',
    title: 'See what is coming',
    body: 'What’s new now has a Coming soon tab: the features planned next, from studies beside the text to reading together with your group.',
  },
  {
    id: 'holy-spirit-gifts',
    date: '2026-09-19',
    title: 'The gifts of the Spirit, and how they go with the fruit',
    body: 'The Holy Spirit study now covers the gifts: the four lists, the nine in 1 Corinthians 12 at work, how every list is wrapped in love, the fruit each gift needs, and gifts without fruit.',
    link: { to: '/study/holy-spirit?view=the-gifts-of-the-spirit', label: 'Open the gifts' },
  },
  {
    id: 'study-holy-spirit',
    date: '2026-09-19',
    title: 'New study: The Holy Spirit',
    body: 'Who he is, how he moves, what he does in us, and the fruit he grows. The Patterns chart counts 39 accounts of the Spirit coming on people: how he came, what followed, and what was happening.',
    link: { to: '/study/holy-spirit', label: 'Open the study' },
  },
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

/**
 * Planned features, shown on the Coming soon tab of What's new. Keep each to a sentence, and
 * promise no dates. The fuller picture lives in the "BibleMap: Future Features" doc.
 */
export const UPCOMING: { title: string; body: string }[] = [
  { title: 'Studies beside the text', body: 'While you read, see every study that includes the verse in front of you.' },
  { title: 'Conversations on every verse', body: 'Share encouragement, questions and honest struggles on any verse, and read what others have written.' },
  { title: 'Groups', body: 'Read and talk with your small group, family or friends in a private circle.' },
  { title: 'A safe, kind community', body: 'Every post is checked against a community standard before it appears, so the conversation stays honest and kind.' },
  { title: 'Reading together', body: 'Follow a reading plan with your group and see who is reading along with you.' },
  { title: 'Teachings from trusted authors', body: 'Teachings on verses and chapters from invited authors, shown beside the text as you read.' },
  { title: 'Voices from church history', body: 'A resources page of writings by Christian men and women of the past, linked to the passages they wrote about.' },
  { title: 'Accounts only if you want one', body: 'Reading stays free without an account. You will only need one to post or join a group.' },
]
