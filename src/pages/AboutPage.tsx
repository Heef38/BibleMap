import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { PageHeader, Section } from '@/components/common/ui'
import { IconHeart } from '@/components/common/icons'
import { SITE } from '@/config/site'
import { usePageTitle } from '@/store/session'

export default function AboutPage() {
  usePageTitle('About BibleMap')
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader kicker="About" title="About BibleMap" subtitle="A free, interactive map of the Bible: its people, places and themes, and how they connect." />

      <Section title="Who is building it">
        <div className="space-y-3 max-w-prose text-[15px] leading-relaxed">
          {SITE.aboutMe.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title="What it does">
        <div className="space-y-3 max-w-prose text-ink-2">
          <p>Search a person, a place or a theme and every reference takes its place across the whole Bible, from Genesis to Revelation. Studies trace a single theme through Scripture, timelines put lives and events in order, and every passage can be read alongside in five public-domain translations.</p>
          <p>
            Everything is built on open data, credited on the <Link to="/credits">sources and licenses</Link> page.
          </p>
        </div>
      </Section>

      <div id="support" className="scroll-mt-4">
        <Section title="Support BibleMap">
          <div className="rounded-xl border border-line bg-surface p-4 max-w-prose space-y-3">
            <p>BibleMap is free to use, and you never need an account. Donations let me spend more time on it, and depending on how it goes, they will pay for more studies and features.</p>
            {SITE.donateUrl && (
              <a href={SITE.donateUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary hover:no-underline">
                <IconHeart />
                Donate
              </a>
            )}
            <p className="text-sm text-ink-2">Sharing BibleMap with a friend and posting ideas on the feedback board help too.</p>
          </div>
        </Section>
      </div>

      <Section title="Get in touch">
        <div className="space-y-3 max-w-prose text-ink-2">
          <p>
            Ideas, corrections and problems go on the <Link to="/feedback">feedback board</Link>. Anyone can post without an account, and upvotes show me which ones matter most.
          </p>
          <p>
            The source code is on{' '}
            <a href={SITE.sourceUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </div>
      </Section>
    </div>
  )
}
