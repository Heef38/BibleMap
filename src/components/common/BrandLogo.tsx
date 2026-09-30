import { EDITION } from '@edition/config'
import { SITE } from '@edition/site'
import { useSettings } from '@/store/settings'
import { useMediaQuery } from '@/lib/hooks'

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/brand/`

/** The artwork in public/brand, made from the originals in logo/ (the dark set is amber and sky blue). */
const SIZES = {
  wide: { w: 704, h: 96 },
  stacked: { w: 480, h: 365 },
  mark: { w: 163, h: 112 },
} as const

/** True when the page is drawn dark: chosen in settings, or the system's choice. */
export function useDarkTheme(): boolean {
  const theme = useSettings((s) => s.theme)
  const osDark = useMediaQuery('(prefers-color-scheme: dark)')
  return theme === 'dark' || (theme === 'system' && osDark)
}

/** The mark of an edition without artwork: the eight-pointed star that divides the Quran's text, as two squares. */
function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <g fill="none" stroke="var(--accent)" strokeWidth={3} strokeLinejoin="round">
        <rect x={10} y={10} width={28} height={28} />
        <rect x={10} y={10} width={28} height={28} transform="rotate(45 24 24)" />
      </g>
      <circle cx={24} cy={24} r={5} fill="var(--accent)" />
    </svg>
  )
}

/**
 * The logo: `wide` for the header, `stacked` for pages, `mark` (the book alone) where there is no
 * room for the name. Size it with a height class; the width follows.
 */
export default function BrandLogo({ variant, className, alt = SITE.name }: { variant: keyof typeof SIZES; className?: string; alt?: string }) {
  const dark = useDarkTheme()
  if (!EDITION.logoArt) {
    const name = <span className="font-semibold tracking-[0.14em] uppercase text-ink">{SITE.name}</span>
    if (variant === 'mark') return <StarMark className={`w-auto ${className ?? ''}`} />
    if (variant === 'stacked')
      return (
        <span className={`inline-flex flex-col items-start gap-2 !h-auto ${className ?? ''}`} role="img" aria-label={alt}>
          <StarMark className="h-16 w-16" />
          <span className="text-2xl">{name}</span>
        </span>
      )
    return (
      <span className={`inline-flex items-center gap-2 ${className ?? ''}`} role="img" aria-label={alt}>
        <StarMark className="h-full w-auto" />
        <span className="text-[15px] leading-none">{name}</span>
      </span>
    )
  }
  const { w, h } = SIZES[variant]
  return <img src={`${BASE}${variant}-${dark ? 'dark' : 'light'}.png`} width={w} height={h} alt={alt} className={`w-auto ${className ?? ''}`} draggable={false} />
}
