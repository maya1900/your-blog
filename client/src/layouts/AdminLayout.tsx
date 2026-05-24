import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  FileText,
  Info,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Tag as TagIcon,
  Tags,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/Avatar'

const navSections: {
  label: string
  items: { to: string; icon: React.ReactNode; label: string }[]
}[] = [
  {
    label: 'OVERVIEW',
    items: [
      {
        to: '/admin',
        icon: <LayoutDashboard size={16} />,
        label: '仪表盘',
      },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { to: '/admin/articles', icon: <FileText size={16} />, label: '文章' },
      { to: '/admin/comments', icon: <MessageSquare size={16} />, label: '评论' },
      { to: '/admin/categories', icon: <Tags size={16} />, label: '分类' },
      { to: '/admin/tags', icon: <TagIcon size={16} />, label: '标签' },
    ],
  },
  {
    label: 'USERS',
    items: [{ to: '/admin/users', icon: <Users size={16} />, label: '用户' }],
  },
  {
    label: 'SITE',
    items: [
      { to: '/admin/site', icon: <Settings size={16} />, label: '站点信息' },
      { to: '/admin/about', icon: <Info size={16} />, label: '关于页' },
    ],
  },
]

export function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { siteTitle, siteLogo } = useSiteSettings()

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onClick = () => setMenuOpen(false)
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-[100dvh] flex bg-canvas">
      {/* ===== Sidebar ===== */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-whisper flex flex-col sticky top-0 h-[100dvh]">
        <div className="px-6 py-5 border-b border-whisper">
          <Link
            to="/"
            className="text-[19px] font-semibold tracking-tight inline-flex items-center gap-2"
            title={siteTitle}
          >
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={siteTitle}
                className="h-7 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span>{siteTitle}</span>
            )}
            <span className="text-steel text-xs font-mono">/ADMIN</span>
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-[26px] mt-5 mb-2 font-mono text-[10px] tracking-[0.08em] text-neutral-400">
                {section.label}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    cn(
                      'group relative mx-3 px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-klein-tint text-klein font-medium'
                        : 'text-steel hover:bg-whisper-soft hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute -left-3 top-2 bottom-2 w-[2.5px] bg-klein rounded" />
                      )}
                      {item.icon}
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          <p className="px-[26px] mt-5 mb-2 font-mono text-[10px] tracking-[0.08em] text-neutral-400">
            SYSTEM
          </p>
          <button
            onClick={handleLogout}
            className="w-[calc(100%-1.5rem)] mx-3 px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 text-sm text-steel hover:bg-whisper-soft hover:text-ink transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </nav>

        <div className="px-6 py-4 border-t border-whisper">
          <div className="flex items-center gap-2 font-mono text-[13px] text-steel">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-signal animate-pulse" />
            <span>SYSTEM HEALTHY</span>
          </div>
          <p className="font-mono text-[13px] text-steel mt-1">v1.0.0 · M6</p>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-whisper">
          <div className="px-8 h-16 flex items-center justify-between">
            <Breadcrumbs />

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-sm text-steel hover:text-ink transition-colors"
              >
                返回首页 →
              </Link>
              <div
                className="relative"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen((v) => !v)
                }}
              >
                <button className="inline-flex items-center gap-2.5 pl-1 pr-3 py-1 border border-whisper rounded-full bg-white hover:border-klein transition">
                  <Avatar
                    username={user?.username ?? 'A'}
                    avatar={user?.avatar}
                    size={28}
                  />
                  <span className="text-sm font-medium">{user?.username ?? '管理员'}</span>
                  <ChevronDown size={14} className="text-steel" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-whisper rounded-lg py-2 shadow-sm">
                    <div className="px-3 py-1.5 border-b border-whisper">
                      <p className="text-sm font-medium text-ink truncate">{user?.username}</p>
                      <p className="text-xs text-steel font-mono truncate">{user?.email}</p>
                    </div>
                    <Link to="/me" className="block px-3 py-2 text-sm hover:bg-whisper-soft transition">
                      个人中心
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-steel hover:bg-whisper-soft transition inline-flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/** Breadcrumb derived from the current location pathname segments. */
function Breadcrumbs() {
  const path = window.location.pathname
  const map: Record<string, string> = {
    '/admin': '仪表盘',
    '/admin/articles': '文章管理',
    '/admin/comments': '评论管理',
    '/admin/categories': '分类管理',
    '/admin/tags': '标签管理',
    '/admin/users': '用户管理',
    '/admin/about': '关于页',
    '/admin/site': '站点信息',
  }
  const title = map[path] ?? '后台'
  const isRoot = path === '/admin'
  return (
    <div className="flex items-center gap-3">
      {!isRoot && (
        <>
          <Link to="/admin" className="font-mono text-[13px] text-steel hover:text-ink">
            仪表盘
          </Link>
          <span className="font-mono text-[13px] text-whisper">/</span>
        </>
      )}
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  )
}
