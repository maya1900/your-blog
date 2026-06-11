import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Link, NavLink } from '@/components/Link'
import { LogOut, PenSquare, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { SearchPalette } from '@/components/SearchPalette'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { Avatar } from '@/components/Avatar'
import { ThemeToggle } from '@/components/ThemeToggle'

export function PublicLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const { siteTitle, siteTagline, siteLogo } = useSiteSettings()

  // Global Cmd/Ctrl + K opens the search palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { viewTransition: true })
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-surface/75 border-b border-whisper">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[22px] font-semibold tracking-tight text-ink"
            title={siteTitle}
          >
            {siteLogo ? (
              <img src={siteLogo} alt={siteTitle} className="h-8 w-auto max-w-[200px] object-contain" />
            ) : (
              siteTitle
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className="nav-link">
              文章
            </NavLink>
            <NavLink to="/categories" className="nav-link">
              分类
            </NavLink>
            <NavLink to="/tags" className="nav-link">
              标签
            </NavLink>
            <NavLink to="/about" className="nav-link">
              关于
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              className="btn-icon"
              aria-label="搜索"
              onClick={() => setSearchOpen(true)}
              title="搜索文章 (Cmd K)"
            >
              <Search size={18} />
            </button>

            {user ? (
              <>
                <Link to="/write" className="btn-primary !py-2 !px-4 text-sm">
                  <PenSquare size={16} />
                  写文章
                </Link>
                <div className="ml-2 group relative">
                  <button className="block rounded-full">
                    <Avatar username={user.username} avatar={user.avatar} size={32} />
                  </button>
                  <div className="absolute right-0 top-full pt-2 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
                    <div className="bg-surface border border-whisper rounded-lg py-2 shadow-sm">
                      <div className="px-3 py-1.5 border-b border-whisper">
                        <p className="text-sm font-medium text-ink truncate">{user.username}</p>
                        <p className="text-xs text-steel font-mono truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/me"
                        className="block px-3 py-2 text-sm hover:bg-whisper-soft transition"
                      >
                        个人中心
                      </Link>
                      {user.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          className="block px-3 py-2 text-sm hover:bg-whisper-soft transition"
                        >
                          管理后台
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-steel hover:bg-whisper-soft transition inline-flex items-center gap-2"
                      >
                        <LogOut size={14} />
                        退出登录
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  登录
                </Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden">
        <div key={`${location.pathname}${location.search}`}>
          <Outlet />
        </div>
      </main>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      <footer className="border-t border-whisper mt-12">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            {siteLogo ? (
              <img src={siteLogo} alt={siteTitle} className="h-9 w-auto max-w-[220px] object-contain" />
            ) : (
              <p className="text-[22px] font-semibold tracking-tight text-ink">{siteTitle}</p>
            )}
            <p className="mt-2 text-sm text-steel">
              {siteTagline}
            </p>
          </div>
          <p className="text-xs text-steel font-mono">
            © 2026 {siteTitle} · v{__APP_VERSION__}
          </p>
        </div>
      </footer>
    </div>
  )
}
