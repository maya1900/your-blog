import { useCallback, useEffect, useState } from 'react'

/**
 * Returns a value that updates only after the input has stopped changing
 * for `delay` ms. Useful for search inputs where we don't want to fire a
 * request on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Stable debounced callback. Wraps `fn` so that calls within `delay` ms collapse
 * into the last invocation.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 300,
) {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [timer])

  return useCallback(
    (...args: A) => {
      if (timer) clearTimeout(timer)
      const t = setTimeout(() => fn(...args), delay)
      setTimer(t)
    },
    [fn, delay, timer],
  )
}
