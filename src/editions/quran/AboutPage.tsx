import { Link } from 'react-router'
import { PageHeader, Section } from '@/components/common/ui'
import BrandLogo from '@/components/common/BrandLogo'
import { EDITION } from '@edition/config'
import { SITE } from '@edition/site'
import { usePageTitle } from '@/store/session'

/** What this site is, how it was made, and how far to trust it. */
export default function AboutPage() {
  usePageTitle(`About ${SITE.name}`, { docTitle: `About ${SITE.name}`, description: SITE.description })
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BrandLogo variant="stacked" className="mb-6" />
      <PageHeader kicker="About" title={`About ${SITE.name}`} subtitle="A map of the Quran for someone reading it for the first time: what it says, where it says it, and how its parts connect." />

      <Section title="What this is">
        <div className="space-y-3 max-w-prose text-[15px] leading-relaxed">
          <p>
            {SITE.name} is built the same way as{' '}
            <a href={EDITION.bibleSite} target="_blank" rel="noopener noreferrer">
              Bible-Map
            </a>
            , for the same kind of reading: the text in the middle, and beside it the people, places, words and themes that run through it. It was made to learn what the Quran itself teaches, from its own words.
          </p>
          <p>It is not listed in search engines. You are here because someone gave you the link.</p>
        </div>
      </Section>

      <Section title="How to read it">
        <div className="space-y-3 max-w-prose text-ink-2">
          <p>
            The Quran is in Arabic, and Muslims hold that only the Arabic is the Quran; a translation is one reader’s understanding of it. The reader opens on Talal Itani’s plain modern English, and offers Wahiduddin Khan’s and Marmaduke Pickthall’s beside the Arabic itself. Where a verse matters, read it in more than one.
          </p>
          <p>
            The studies gather what the text says on one subject and sort it, with a note on each passage. They describe; they do not argue for the Quran or against it. Where a passage is hard, or is read in more than one way by Muslims themselves, the note says so. A study is still one person’s selection and wording: every reference was checked against the text, and each opens the passage beside it so you can judge it yourself.
          </p>
          <p>
            Where the Bible tells the same story or speaks to the same question, a study links to the passage on Bible-Map, so the two can be read side by side. To begin, open <Link to="/study/main-themes">the main themes of the Quran</Link>.
          </p>
          <p>
            Much of what Islam teaches and practices comes from outside the Quran: the sayings and practice of Muhammad (the hadith), the early biographies, the schools of law and the commentaries. This site maps the Quran alone. Where a date, an occasion or a practice comes from that wider tradition and not from the text, it is marked as tradition.
          </p>
        </div>
      </Section>

      <Section title="What is computed and what is written">
        <div className="space-y-3 max-w-prose text-ink-2">
          <p>
            People, places and the word lists are read off the Arabic, using the word-by-word grammar of the Quranic Arabic Corpus: every verse where the name or the word stands. The “related verses” on a verse’s map are found by the Arabic words two verses share. Neither is a judgement; both are counts.
          </p>
          <p>The studies, the summary and outline of each surah, the notes on people and places and the list of events are written for this site.</p>
          <p>
            Every source is credited on the <Link to="/credits">sources and licenses</Link> page.
          </p>
        </div>
      </Section>
    </div>
  )
}
