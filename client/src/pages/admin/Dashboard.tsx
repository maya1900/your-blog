import { useQuery } from '@tanstack/react-query'
import { Link } from '@/components/Link'
import {
  Eye,
  Heart,
  MessageSquare,
  PenSquare,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { getStats, type AdminStats } from '@/api/admin'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/Avatar'

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getStats,
    refetchOnWindowFocus: false,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 bg-whisper-soft rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-whisper-soft rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const greeting = greetingByHour()
  const totalPageviews = metric(data.totals.pageviews, data.totals.views)
  const weekPageviews = metric(data.thisWeek.pageviews)
  const weekVisits = metric(data.thisWeek.visits)
  const totalVisits = metric(data.totals.visits)
  const trendUp = weekPageviews > 0

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting},管理员
          </h2>
          <p className="mt-1 text-steel">
            本周访问{' '}
            <span className="text-klein font-medium">+{weekVisits}</span>,
            浏览{' '}
            <span className="text-klein font-medium">+{weekPageviews}</span>,
            评论{' '}
            <span className="text-klein font-medium">+{data.thisWeek.comments}</span>,
            新用户{' '}
            <span className="text-klein font-medium">+{data.thisWeek.users}</span>。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/write" className="btn-primary !py-2 !px-4 text-sm">
            <PenSquare size={14} />
            写文章
          </Link>
        </div>
      </div>

      {/* Bento Row 1: hero + 2 stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <HeroStat
          label="PAGE VIEWS"
          value={totalPageviews}
          delta={weekPageviews}
          trend={data.trend}
          trendUp={trendUp}
        />
        <StatCard
          label="VISITS"
          value={totalVisits}
          delta={weekVisits}
          deltaLabel="this week"
          icon={<Users size={14} />}
          deltaUp
        />
        <StatCard
          label="COMMENTS"
          value={data.totals.comments}
          delta={data.thisWeek.comments}
          deltaLabel="this week"
          icon={<MessageSquare size={14} />}
          deltaUp
        />
      </div>

      {/* Bento Row 2: new users / article reads / reactions / categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="NEW USERS · 7D"
          value={data.thisWeek.users}
          icon={<UserPlus size={14} />}
          subline={`累计用户 ${formatNum(data.totals.users)}`}
        />
        <StatCard
          label="ARTICLE READS"
          value={data.totals.views}
          icon={<Eye size={14} />}
          subline="文章详情累计"
        />
        <StatCard
          label="REACTIONS"
          value={data.totals.likes + data.totals.favorites}
          icon={<Heart size={14} />}
          subline={`喜欢 ${data.totals.likes} · 收藏 ${data.totals.favorites}`}
          tinted
        />
        <StatCard
          label="TOP CATEGORIES"
          value={data.topCategories.length}
          subline={
            data.topCategories
              .slice(0, 3)
              .map((c) => `${c.name} ${c.count}`)
              .join(' · ') || '—'
          }
        />
      </div>

      {/* Two-column: recent articles + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-whisper rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-whisper flex items-center justify-between">
            <h3 className="text-base font-semibold">最近文章</h3>
            <Link
              to="/admin/articles"
              className="text-xs text-klein hover:text-klein-deep font-medium"
            >
              查看全部 →
            </Link>
          </div>
          {data.recentArticles.length === 0 ? (
            <p className="px-5 py-10 text-center text-steel text-sm">还没有文章</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>AUTHOR</th>
                  <th>STATUS</th>
                  <th className="text-right">VIEWS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {data.recentArticles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        to={`/articles/${a.slug}`}
                        className="font-medium text-ink hover:text-klein line-clamp-1 max-w-[300px] inline-block"
                      >
                        {a.title}
                      </Link>
                      <p className="font-mono text-[13px] text-steel mt-0.5">
                        {a.category?.name ?? '—'} · {a.slug}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar
                          username={a.author.username}
                          avatar={a.author.avatar}
                          size={24}
                        />
                        <span className="text-sm">{a.author.username}</span>
                      </div>
                    </td>
                    <td>
                      <StatusChip status={a.status} />
                    </td>
                    <td className="text-right font-mono text-[13px]">
                      {a.status === 'PUBLISHED' ? a.viewCount : '—'}
                    </td>
                    <td className="font-mono text-[13px] text-steel">
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-surface border border-whisper rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-whisper flex items-center justify-between">
            <h3 className="text-base font-semibold">最新评论</h3>
            <Link
              to="/admin/comments"
              className="text-xs text-klein hover:text-klein-deep font-medium"
            >
              全部 →
            </Link>
          </div>
          <div className="p-5 space-y-4 flex-1">
            {data.recentComments.length === 0 ? (
              <p className="text-center text-steel text-sm py-6">还没有评论</p>
            ) : (
              data.recentComments.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <Avatar username={c.user.username} avatar={c.user.avatar} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{c.user.username}</span>
                      <span className="text-steel"> 评论了 </span>
                      <Link
                        to={`/articles/${c.article.slug}`}
                        className="text-ink hover:text-klein"
                      >
                        {truncate(c.article.title, 18)}
                      </Link>
                    </p>
                    <p className="mt-1 text-sm text-steel line-clamp-2">{c.content}</p>
                    <p className="mt-1 font-mono text-[13px] text-steel">
                      {timeAgo(c.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Building blocks ============

function HeroStat({
  label,
  value,
  delta,
  trend,
  trendUp,
}: {
  label: string
  value: number
  delta: number
  trend: AdminStats['trend']
  trendUp: boolean
}) {
  return (
    <div className="relative md:col-span-2 bg-surface border border-whisper rounded-xl p-5 hover:border-klein transition-colors overflow-hidden">
      <p className="font-mono text-[11px] tracking-[0.08em] text-steel">{label}</p>
      <div className="mt-3 flex items-end gap-4">
        <span className="font-mono text-[52px] leading-none font-semibold text-ink tracking-[-0.025em]">
          {formatNum(value)}
        </span>
        <span
          className={cn(
            'font-mono text-[12px] inline-flex items-center gap-1 mb-2',
            trendUp ? 'text-emerald-signal' : 'text-red-500',
          )}
        >
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta >= 0 ? '+' : ''}
          {delta} this week
        </span>
      </div>
      <Sparkline points={trend.map((t) => t.count)} />
      <div className="absolute top-5 right-5 font-mono text-[13px] text-steel">30D TREND</div>
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  subline,
  tinted,
  deltaUp = true,
}: {
  label: string
  value: number
  delta?: number
  deltaLabel?: string
  icon?: React.ReactNode
  subline?: string
  tinted?: boolean
  deltaUp?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-5 border transition-colors',
        tinted
          ? 'bg-klein text-white border-klein'
          : 'bg-surface border-whisper hover:border-klein',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            'font-mono text-[11px] tracking-[0.08em]',
            tinted ? 'text-white/70' : 'text-steel',
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full',
              tinted ? 'bg-white/12 text-white' : 'bg-whisper-soft text-steel',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'font-mono text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.025em] mt-3',
          tinted ? 'text-white' : 'text-ink',
        )}
      >
        {formatNum(value)}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            'font-mono text-[12px] mt-2 inline-flex items-center gap-1',
            tinted
              ? 'text-white/95'
              : deltaUp
                ? 'text-emerald-signal'
                : 'text-red-500',
          )}
        >
          {deltaUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          +{delta} {deltaLabel}
        </p>
      )}
      {subline && (
        <p
          className={cn(
            'font-mono text-[12px] mt-2',
            tinted ? 'text-white/70' : 'text-steel',
          )}
        >
          {subline}
        </p>
      )}
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) return null
  const max = Math.max(1, ...points)
  const w = 400
  const h = 64
  const stepX = w / Math.max(1, points.length - 1)
  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = h - (p / max) * (h - 8) - 4
    return [x, y] as const
  })
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-4 w-full h-16 text-klein">
      <defs>
        <linearGradient id="sg-main" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg-main)" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function StatusChip({ status }: { status: 'DRAFT' | 'PUBLISHED' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-[22px] px-2 rounded-chip text-xs font-medium',
        status === 'PUBLISHED'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700',
      )}
    >
      {status}
    </span>
  )
}

// ============ utils ============

function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 6) return '深夜好'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-US')
}

function metric(...values: Array<number | undefined | null>): number {
  return values.find((v): v is number => typeof v === 'number' && Number.isFinite(v)) ?? 0
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(iso)
}
