import { Link } from 'react-router'
import CanonStrip from '@/components/viz/CanonStrip'
import { Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadCanon, loadManifest, loadStudiesIndex } from '@/data/loaders'

const STARTERS: { label: string; to: string }[] = [
  { label: 'David', to: '/search?q=David' },
  { label: 'Jerusalem', to: '/search?q=Jerusalem' },
  { label: 'Abraham', to: '/search?q=Abraham' },
  { label: 'Passover', to: '/search?q=Passover' },
  { label: 'Faith', to: '/search?q=faith' },
  { label: 'Shepherd', to: '/search?q=shepherd' },
]

export default function HomePage() {
  const { data: canon } = useData('canon', loadCanon)
  const { data: studies } = useData('studies-index', loadStudiesIndex)
  const { data: manifest } = useData('manifest', loadManifest)
  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        kicker="BibleMap"
        title="See how the story connects."
        subtitle="Search a person, a place or a theme, and watch every reference take its place across the whole Bible. Click anything to read it alongside."
      />
      {canon ? <CanonStrip canon={canon} ranges={[]} caption="The Bible as a strip: 66 books, each drawn to the length of its text. Every map in BibleMap sits on this strip." /> : <Loading />}

      <Section title="Studies" count={studies?.length}>
        {studies?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {studies.map((s) => (
              <Link key={s.id} to={`/study/${s.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:no-underline text-ink">
                <div className="font-semibold text-base">{s.title}</div>
                {s.subtitle && <div className="text-ink-2 text-sm mt-0.5">{s.subtitle}</div>}
                <div className="text-xs text-muted mt-2">
                  {s.refCount} references · {s.verseCount.toLocaleString()} verses
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-muted text-sm">No studies compiled yet. Add a YAML file under data/studies and run the data build.</div>
        )}
      </Section>

      <Section title="Explore">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/timeline" className="block rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:no-underline text-ink">
            <div className="font-semibold text-base">The story in time</div>
            <div className="text-ink-2 text-sm mt-0.5">Every dated event from creation to the apostles on one zoomable timeline.</div>
          </Link>
          <Link to="/bible" className="block rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:no-underline text-ink">
            <div className="font-semibold text-base">How the Bible is laid out</div>
            <div className="text-ink-2 text-sm mt-0.5">The 66 books by kind of writing, drawn to size, with an outline of each.</div>
          </Link>
          <Link to="/compare?a=david_994&b=saul_2478" className="block rounded-xl border border-line bg-surface p-4 hover:border-line-strong hover:no-underline text-ink">
            <div className="font-semibold text-base">Compare two people</div>
            <div className="text-ink-2 text-sm mt-0.5">Two lives on one map: the people, places and events they share, and what is theirs alone.</div>
          </Link>
        </div>
      </Section>

      <Section title="Start somewhere">
        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <Link key={s.label} to={s.to} className="chip chip-link">
              {s.label}
            </Link>
          ))}
        </div>
      </Section>

      {manifest && (
        <Section title="What is inside">
          <p className="text-sm text-ink-2 max-w-prose">
            {manifest.verses.toLocaleString()} verses in five public-domain translations, {manifest.people.toLocaleString()} people, {manifest.places.toLocaleString()} places and {manifest.events} dated events, 344,799 cross references and 5,941 classic topical entries. Dates follow traditional chronology and are approximate.{' '}
            <Link to="/credits">Sources and licenses</Link>.
          </p>
        </Section>
      )}
    </div>
  )
}
