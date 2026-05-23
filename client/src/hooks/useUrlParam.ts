import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Read & write a single URL search-param as if it were React state.
 *
 *   const [keyword, setKeyword] = useUrlParam('keyword', '')
 *
 * Setting to the default value (or empty string) deletes the param to keep
 * URLs tidy. Updates are merged into existing params (other keys preserved).
 */
export function useUrlParam(
  key: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string) => {
      const updated = new URLSearchParams(params)
      if (!next || next === defaultValue) updated.delete(key)
      else updated.set(key, next)
      setParams(updated, { replace: false })
    },
    [params, setParams, key, defaultValue],
  )

  return [value, setValue]
}

/**
 * Same idea but for numbers (e.g. ?page=2).
 */
export function useUrlNumberParam(
  key: string,
  defaultValue: number,
): [number, (value: number) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(key)
  const value = useMemo(() => {
    if (raw === null) return defaultValue
    const n = Number(raw)
    return Number.isFinite(n) ? n : defaultValue
  }, [raw, defaultValue])

  const setValue = useCallback(
    (next: number) => {
      const updated = new URLSearchParams(params)
      if (next === defaultValue) updated.delete(key)
      else updated.set(key, String(next))
      setParams(updated, { replace: false })
    },
    [params, setParams, key, defaultValue],
  )

  return [value, setValue]
}
