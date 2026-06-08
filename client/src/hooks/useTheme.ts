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
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
