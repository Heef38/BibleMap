import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import VerseMap from '@/components/connections/VerseMap'
import { IconArrowLeft, IconExpand, IconMap, IconShrink, IconX } from '@/components/common/icons'
import { useData } from '@/data/useData'
import { loadCanon } from '@/data/loaders'
import { useSession } from '@/store/session'

/**
 * The right pane: the page (a study, a person, this chapter…) and, over it, the map of a verse
 * picked in the Bible. The page stays mounted under the map, so letting the verse go returns to
 * the study just as it was.
 */
export default function RightPane({ children, mobile }: { children: ReactNode; mobile: boolean }) {
  const { data: canon } = useData('canon', loadCanon)
  const mapVerse = useSession((s) => s.mapVerse)
  const pageTitle = useSession((s) => s.pageTitle)
  const wide = useSession((s) => s.wide)
  const setWide = useSession((s) => s.setWide)
  const selectVerse = useSession((s) => s.selectVerse)
  const { pathname } = useLocation()
  const pageRef = useRef<HTMLElement>(null)
  const mapOpen = mapVerse !== null

  // A new page opens at its top.
  useEffect(() => {
    pageRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="h-full flex flex-col min-h-0">
      {(!mobile || mapOpen) && (
        <div className="flex items-center gap-1 px-3 min-h-12 border-b border-line bg-surface shrink-0">
          {mapOpen ? (
            <>
              <button type="button" className="btn btn-ghost -ml-2 min-w-0 max-w-[55%]" onClick={() => selectVerse(null)} title={`Back to ${pageTitle}`}>
                <IconArrowLeft className="shrink-0" />
                <span className="truncate">{pageTitle}</span>
              </button>
              <span className="text-muted" aria-hidden>
                /
              </span>
              <span className="font-medium truncate min-w-0">{canon?.label(mapVerse)}</span>
            </>
          ) : (
            <span className="font-medium truncate min-w-0">{pageTitle}</span>
          )}
          <div className="ml-auto flex items-center gap-0.5 shrink-0">
            {!mapOpen && pathname !== '/' && (
              <Link to="/" className="btn btn-ghost hover:no-underline" title="The chapter you are reading, and where it connects" style={{ color: 'var(--ink)' }}>
                <IconMap /> <span className="max-[1180px]:hidden">This chapter</span>
              </Link>
            )}
            {mapOpen && (
              <button type="button" className="btn btn-ghost" onClick={() => selectVerse(null)} title="Close the verse map" aria-label="Close the verse map">
                <IconX />
              </button>
            )}
            {!mobile && (
              <button type="button" className="btn btn-ghost" aria-pressed={wide} onClick={() => setWide(!wide)} title={wide ? 'Bring the Bible back' : 'Widen this pane over the Bible'} aria-label={wide ? 'Bring the Bible back' : 'Widen this pane over the Bible'}>
                {wide ? <IconShrink /> : <IconExpand />}
              </button>
            )}
          </div>
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <main ref={pageRef} className={`absolute inset-0 overflow-y-auto ${mapOpen ? 'invisible' : ''}`} inert={mapOpen} aria-hidden={mapOpen || undefined}>
          {children}
        </main>
        {mapOpen && (
          <div key={mapVerse} className="absolute inset-0 overflow-y-auto" style={{ background: 'var(--page)' }} role="region" aria-label={`Connections of ${canon?.label(mapVerse) ?? 'the verse'}`}>
            <VerseMap ordinal={mapVerse} />
          </div>
        )}
      </div>
    </div>
  )
}
