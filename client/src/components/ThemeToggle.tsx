import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="btn-icon"
      aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
      title={isDark ? '浅色主题' : '深色主题'}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        toggleTheme({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      }}
    >
      {isDark ? (
        <Sun key="sun" size={18} className="theme-toggle-icon" />
      ) : (
        <Moon key="moon" size={18} className="theme-toggle-icon" />
      )}
    </button>
  )
}
