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
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
