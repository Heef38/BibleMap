import { useEffect } from 'react'
import { PageHeader, Section } from '@/components/common/ui'
import { IconDownload } from '@/components/common/icons'
import { usePageTitle, useSession } from '@/store/session'

// An unlisted page: nothing links here and it is kept out of search, so the link can be sent by hand.
const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/downloads/madepurely/`

const STICKERS = [
  { code: 'HSC', name: 'Holy Spirit Come', width: 622, height: 918 },
  { code: 'JLY', name: 'Jesus Loves You', width: 940, height: 594 },
]

function DownloadLink({ file, name, label, note, primary }: { file: string; name?: string; label: string; note?: string; primary?: boolean }) {
  return (
    <a href={BASE + file} download={name ?? file} className={primary ? 'btn btn-primary' : 'btn'}>
      <IconDownload />
      {label}
      {note && <span className="text-xs opacity-70">{note}</span>}
    </a>
  )
}

export default function StickersPage() {
  usePageTitle('Stickers', { docTitle: 'Stickers', noindex: true })

  // Open over the Bible on desktop, and hand the Bible back on the way out.
  const setWide = useSession((s) => s.setWide)
  useEffect(() => {
    const before = useSession.getState().wide
    setWide(true)
    return () => setWide(before)
  }, [setWide])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        kicker="Stickers"
        title="For Katelyn"
        subtitle="Two stickers, ready to print. SVG and EPS are vectors that scale to any size, and the PNGs have transparent backgrounds."
        right={<DownloadLink file="MadePurely-stickers.zip" label="Download all" note="2.8 MB" primary />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {STICKERS.map((s) => (
          <div key={s.code} className="min-w-0 rounded-xl border border-line bg-surface p-4 flex flex-col gap-3">
            <div className="rounded-lg bg-surface-2 p-4 aspect-square">
              <img src={`${BASE}${s.code}.png`} alt={`${s.name} sticker`} width={s.width} height={s.height} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted">
                PNG is {s.width} × {s.height} px
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DownloadLink file={`${s.code}.svg`} label="SVG" />
              <DownloadLink file={`${s.code}.eps`} label="EPS" />
              <DownloadLink file={`${s.code}.png`} label="PNG" />
            </div>
          </div>
        ))}
      </div>

      <Section title="Both together">
        <div className="rounded-xl border border-line bg-surface p-4 flex flex-wrap items-center gap-3">
          <p className="text-ink-2 flex-1 min-w-[14rem]">The Illustrator file with both stickers on one artboard.</p>
          <DownloadLink file="HSC-JLY.ai" name="HSC JLY.ai" label="Illustrator (.ai)" />
        </div>
      </Section>
    </div>
  )
}
