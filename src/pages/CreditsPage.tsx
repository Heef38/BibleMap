import { Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadManifest } from '@/data/loaders'
import { usePageTitle } from '@/store/session'
import { EDITION } from '@edition/config'

export default function CreditsPage() {
  usePageTitle('Sources and licenses', { description: EDITION.text.creditsDescription })
  const { data: manifest } = useData('manifest', loadManifest)
  if (!manifest) return <div className="p-6"><Loading /></div>
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader kicker="About" title="Sources and licenses" subtitle={`Data compiled ${manifest.generatedAt}. ${EDITION.text.creditsIntro}`} />
      <Section title="Sources">
        <ul className="divide-y divide-line text-sm">
          {manifest.sources.map((s) => (
            <li key={s.id} className="py-2 flex flex-wrap gap-x-4 gap-y-1 items-baseline">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-medium">
                {s.name}
              </a>
              <span className="text-ink-2">{s.license}</span>
              {s.note && <span className="basis-full text-xs text-muted">{s.note}</span>}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Notes">
        <div className="text-sm text-ink-2 space-y-2 max-w-prose">
          {EDITION.text.credits.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>
    </div>
  )
}
