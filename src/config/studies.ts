/**
 * The shelves on the Studies page, in order. A study not listed here lands on the last shelf,
 * so a new study shows up before anyone files it.
 */
export const SHELVES: { title: string; note: string; ids: string[] }[] = [
  {
    title: 'The life and words of Jesus',
    note: 'What he taught, the stories he told, and what he did.',
    ids: ['teachings-of-jesus', 'sermon-on-the-mount', 'the-parables', 'miracles-of-jesus', 'kingdom-of-heaven'],
  },
  {
    title: 'Christ in the Old Testament',
    note: 'The types, shadows and promises that point to him.',
    ids: ['christ-in-the-old-testament', 'tabernacle-and-temple', 'materials-and-meanings', 'exodus-and-the-christian-life'],
  },
  {
    title: 'God with his people',
    note: 'His presence, his Spirit, and his promises.',
    ids: ['presence-of-god', 'holy-spirit', 'promises-of-god'],
  },
  {
    title: 'Books of the Bible',
    note: 'One book at a time: how it is built, who it was written to, and where it leads.',
    ids: ['isaiah', 'psalms'],
  },
]

export const OTHER_SHELF = { title: 'More studies', note: '' }
