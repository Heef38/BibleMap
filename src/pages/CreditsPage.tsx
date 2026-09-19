import { Loading, PageHeader, Section } from '@/components/common/ui'
import { useData } from '@/data/useData'
import { loadManifest } from '@/data/loaders'

export default function CreditsPage() {
  const { data: manifest } = useData('manifest', loadManifest)
  if (!manifest) return <div className="p-6"><Loading /></div>
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader kicker="About" title="Sources and licenses" subtitle={`Data compiled ${manifest.generatedAt}. BibleMap is built entirely on open data; each source keeps its own license.`} />
      <Section title="Sources">
        <ul className="divide-y divide-line text-sm">
          {manifest.sources.map((s) => (
            <li key={s.id} className="py-2 flex flex-wrap gap-x-4 gap-y-1 items-baseline">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-medium">
                {s.name}
              </a>
              <span className="text-ink-2">{s.license}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Notes">
        <div className="text-sm text-ink-2 space-y-2 max-w-prose">
          <p>Years attached to verses, people and events follow the traditional (Ussher-style) chronology used by the Theographic dataset. They are approximate and are shown to order the story, not to settle it.</p>
          <p>Cross-reference weights are the community votes recorded by OpenBible.info; a higher bar means more readers found the link helpful.</p>
          <p>Studies (the theme maps) are hand-authored in this project and carry the judgement of their author. The words of Jesus are taken from the red-letter markup of the Berean Standard Bible.</p>
          <p>Theographic Bible Metadata is shared under CC BY-SA 4.0; derived entity data in this app is shared under the same terms.</p>
        </div>
      </Section>
    </div>
  )
}
