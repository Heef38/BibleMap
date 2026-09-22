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

/**
 * The BIBLE-MAP logo: `wide` for the header, `stacked` for pages, `mark` (the book alone) where
 * there is no room for the name. Size it with a height class; the width follows.
 */
export default function BrandLogo({ variant, className, alt = 'Bible-Map' }: { variant: keyof typeof SIZES; className?: string; alt?: string }) {
  const dark = useDarkTheme()
  const { w, h } = SIZES[variant]
  return <img src={`${BASE}${variant}-${dark ? 'dark' : 'light'}.png`} width={w} height={h} alt={alt} className={`w-auto ${className ?? ''}`} draggable={false} />
}
