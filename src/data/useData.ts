import { useEffect, useState } from 'react'

const resolved = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

/**
 * Load something once per key and share it across components. Results are
 * cached for the life of the page, so navigating back is instant.
 */
export function useData<T>(key: string | null, loader: () => Promise<T>): AsyncState<T> {
  const cached = key !== null && resolved.has(key) ? (resolved.get(key) as T) : undefined
  const [, bump] = useState(0)
  const [error, setError] = useState<Error | undefined>(undefined)

  useEffect(() => {
    if (key === null || resolved.has(key)) return
    let alive = true
    let p = pending.get(key) as Promise<T> | undefined
    if (!p) {
      p = loader()
      pending.set(key, p)
    }
    p.then(
      (value) => {
        resolved.set(key, value)
        pending.delete(key)
        if (alive) bump((n) => n + 1)
      },
      (err: unknown) => {
        pending.delete(key)
        if (alive) setError(err instanceof Error ? err : new Error(String(err)))
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (key === null) return { data: undefined, error: undefined, loading: false }
  return { data: cached, error, loading: cached === undefined && !error }
}

/** Read a cached value synchronously (undefined when it has not loaded yet). */
export function peekData<T>(key: string): T | undefined {
  return resolved.get(key) as T | undefined
}
