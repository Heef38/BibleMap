import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

export function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

/** The rendered width of an element, kept up to date by a ResizeObserver. */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  const observed = useRef<{ el: HTMLElement; ro: ResizeObserver } | null>(null)
  // No dependency list on purpose: the element may appear after data loads.
  useLayoutEffect(() => {
    const el = ref.current
    if (observed.current?.el === el) return
    observed.current?.ro.disconnect()
    observed.current = null
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.round(e.contentRect.width))
    })
    ro.observe(el)
    observed.current = { el, ro }
  })
  useEffect(() => () => observed.current?.ro.disconnect(), [])
  return width
}

export function usePrevious<T>(value: T): T | undefined {
  const r = useRef<T | undefined>(undefined)
  useEffect(() => {
    r.current = value
  })
  return r.current
}
