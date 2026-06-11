import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'moji-theme'
const listeners = new Set<(theme: Theme) => void>()

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
}

let currentTheme: Theme = getStoredTheme() ?? getSystemTheme()
applyTheme(currentTheme)

function setTheme(nextTheme: Theme) {
  currentTheme = nextTheme
  applyTheme(nextTheme)
  try {
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
  } catch {
    // Theme still applies for the current session when storage is unavailable.
  }
  listeners.forEach((listener) => listener(nextTheme))
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

// Duration of the circular reveal, in ms. Bump toward 1000 for a slower sweep.
const REVEAL_DURATION_MS = 600

/**
 * Switch the theme with a circular reveal centred on `origin` (the toggle
 * button). The new theme is clipped to a circle that grows from a point to
 * cover the whole viewport, via the View Transitions API.
 *
 * Falls back to an instant switch (with the global colour fade) when the API
 * is unavailable, the user prefers reduced motion, or no origin is given.
 */
function setThemeWithReveal(nextTheme: Theme, origin?: { x: number; y: number }) {
  if (typeof document === 'undefined') {
    setTheme(nextTheme)
    return
  }

  const doc = document as ViewTransitionDocument
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!doc.startViewTransition || prefersReduced || !origin) {
    setTheme(nextTheme)
    return
  }

  const { x, y } = origin
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  const root = document.documentElement
  // Freeze the global colour transition so the snapshot the API captures shows
  // the final new-theme colours, not a frame caught mid-fade.
  root.classList.add('theme-reveal')

  const transition = doc.startViewTransition(() => {
    setTheme(nextTheme)
  })

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: REVEAL_DURATION_MS,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {
      // Transition was skipped (e.g. rapid re-toggle); theme is already applied.
    })

  transition.finished.finally(() => {
    root.classList.remove('theme-reveal')
  })
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  useEffect(() => {
    listeners.add(setThemeState)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (getStoredTheme()) return
      const nextTheme = getSystemTheme()
      currentTheme = nextTheme
      applyTheme(nextTheme)
      listeners.forEach((listener) => listener(nextTheme))
    }
    media.addEventListener('change', onSystemChange)

    return () => {
      listeners.delete(setThemeState)
      media.removeEventListener('change', onSystemChange)
    }
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: (origin?: { x: number; y: number }) =>
      setThemeWithReveal(theme === 'dark' ? 'light' : 'dark', origin),
  }
}
