import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Edit3, Eye, PenSquare, Heart, Calendar, FileText } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { useAuthStore } from '@/stores/auth.store'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

type Tab = 'published' | 'drafts' | 'favorites' | 'profile'

export function MePage() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('published')

  // Counts shown next to tabs — same query as published list, just total.
  const publishedQuery = useQuery({
    queryKey: ['my-articles', user?.id, 'PUBLISHED'],
    queryFn: () =>
      listArticles({
        authorId: user!.id,
        status: 'PUBLISHED',
        pageSize: 50,
      }),
    enabled: !!user,
  })

  const draftsQuery = useQuery({
    queryKey: ['my-articles', user?.id, 'DRAFT'],
    queryFn: () =>
      listArticles({
        authorId: user!.id,
        status: 'DRAFT',
        pageSize: 50,
      }),
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-16">
        <p className="text-steel font-mono text-sm">LOADING…</p>
      </div>
    )
  }

  const publishedCount = publishedQuery.data?.total ?? 0
  const draftsCount = draftsQuery.data?.total ?? 0

  return (
    <>
      {/* Profile header */}
      <section className="border-b border-whisper bg-white/40">
        <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12">
          <div className="flex items-start gap-8 flex-wrap">
            <div className="w-24 h-24 rounded-full border border-whisper overflow-hidden bg-whisper-soft shrink-0">
              {user.avatar && (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-semibold tracking-tight">{user.username}</h1>
                <span
                  className={cn(
                    'chip',
                    user.role === 'ADMIN' && 'chip-active',
                  )}
                >
                  {user.role}
                </span>
                <span className="font-mono text-xs text-steel">@{user.username}</span>
              </div>
              {user.bio && <p className="mt-3 text-steel max-w-xl">{user.bio}</p>}
              <div className="mt-4 flex items-center gap-2 font-mono text-xs text-steel">
                <Calendar size={13} />
                <span>加入于 {formatDate(user.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-start gap-8">
              <div className="flex items-start gap-10">
                <Stat label="ARTICLES" value={publishedCount} />
                <Stat label="DRAFTS" value={draftsCount} />
                <Stat label="FAVORITES" value="—" />
              </div>
              <Link to="/write" className="btn-primary !py-2 !px-4 text-sm">
                <PenSquare size={14} />
                写文章
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-[1080px] mx-auto px-6 md:px-10">
        <nav className="flex gap-8 border-b border-whisper mt-2">
          <TabItem
            active={tab === 'published'}
            onClick={() => setTab('published')}
            label="我的文章"
            count={publishedCount}
          />
          <TabItem
            active={tab === 'drafts'}
            onClick={() => setTab('drafts')}
            label="草稿"
            count={draftsCount}
          />
          <TabItem
            active={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            label="我的收藏"
            placeholder
          />
          <TabItem active={tab === 'profile'} onClick={() => setTab('profile')} label="资料" />
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-[1080px] mx-auto px-6 md:px-10 pt-8 pb-20">
        {tab === 'published' && (
          <ArticleList query={publishedQuery} emptyMessage="还没有发布过文章" />
        )}
        {tab === 'drafts' && (
          <ArticleList query={draftsQuery} emptyMessage="还没有草稿" tinted />
        )}
        {tab === 'favorites' && (
          <EmptyState
            icon={<Heart size={28} strokeWidth={1.5} />}
            title="M4 待实现"
            description="点赞与收藏将在 M4 阶段上线"
          />
        )}
        {tab === 'profile' && <ProfileView />}
      </main>
    </>
  )
}

// ============ pieces ============

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-2xl font-semibold text-ink tracking-tight leading-none">
        {value}
      </span>
      <span className="font-mono text-[11px] text-steel tracking-[0.08em] mt-1">{label}</span>
    </div>
  )
}

function TabItem({
  active,
  onClick,
  label,
  count,
  placeholder,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  placeholder?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative py-3.5 text-[15px] transition-colors inline-flex items-center gap-2',
        active ? 'text-klein' : 'text-steel hover:text-ink',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded font-mono text-[11px]',
            active ? 'bg-klein-tint text-klein' : 'bg-whisper-soft text-steel',
          )}
        >
          {count}
        </span>
      )}
      {placeholder && (
        <span className="font-mono text-[10px] text-steel/60">M4</span>
      )}
      {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-klein" />}
    </button>
  )
}

interface ArticleListProps {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listArticles>>>>
  emptyMessage: string
  tinted?: boolean
}

function ArticleList({ query, emptyMessage, tinted }: ArticleListProps) {
  if (query.isLoading) {
    return <p className="text-steel font-mono text-sm py-8">LOADING…</p>
  }
  if (query.isError) {
    return <p className="text-red-600 py-8">{(query.error as Error).message}</p>
  }
  const items = query.data?.items ?? []
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={28} strokeWidth={1.5} />}
        title={emptyMessage}
        description={tinted ? '开始一个新草稿,不发布也能保存' : '写下你的第一篇文章吧'}
        action={
          <Link to="/write" className="btn-primary !py-2 !px-4 text-sm">
            <PenSquare size={14} />
            写文章
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <article
          key={a.id}
          className={cn(
            'grid grid-cols-[160px_1fr_auto] gap-6 p-5 rounded-xl border transition-colors',
            tinted
              ? 'bg-amber-50/50 border-amber-100 hover:border-klein'
              : 'bg-white border-whisper hover:border-klein',
          )}
        >
          <Link
            to={`/articles/${a.slug}`}
            className="w-40 h-24 rounded-lg overflow-hidden border border-whisper bg-whisper-soft block"
          >
            {a.coverUrl ? (
              <img
                src={a.coverUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: tinted ? 'grayscale(40%)' : undefined }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-steel">
                <FileText size={20} strokeWidth={1.5} />
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={a.status} />
              <span className="chip">{a.category.name}</span>
              {a.tags.slice(0, 2).map((t) => (
                <span key={t.id} className="chip">
                  {t.name}
                </span>
              ))}
            </div>
            <h3 className="text-lg font-semibold leading-snug">
              <Link to={`/articles/${a.slug}`} className="hover:text-klein">
                {a.title}
              </Link>
            </h3>
            {a.summary && (
              <p className="mt-1 text-sm text-steel line-clamp-2">{a.summary}</p>
            )}
            <div className="mt-3 flex items-center gap-4 font-mono text-xs text-steel">
              <span>{formatDate(a.publishedAt ?? a.createdAt)}</span>
              {a.status === 'PUBLISHED' && (
                <>
                  <span className="text-whisper">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} />
                    {a.viewCount.toLocaleString()}
                  </span>
                </>
              )}
              <span className="text-whisper">·</span>
              <span>{a._count.comments} 评论</span>
            </div>
          </div>

          <div className="flex items-center gap-1 self-start">
            <Link to={`/articles/${a.slug}`} className="btn-icon !w-8 !h-8" title="查看">
              <Eye size={14} />
            </Link>
            <Link to={`/write/${a.id}`} className="btn-icon !w-8 !h-8" title="编辑">
              <Edit3 size={14} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  )
}

function ProfileView() {
  const user = useAuthStore((s) => s.user)!
  return (
    <div className="border border-whisper rounded-xl bg-white p-6 max-w-xl">
      <dl className="grid grid-cols-[120px_1fr] gap-y-3 font-mono text-sm">
        <dt className="text-steel">USERNAME</dt>
        <dd className="text-ink">{user.username}</dd>
        <dt className="text-steel">EMAIL</dt>
        <dd className="text-ink">{user.email}</dd>
        <dt className="text-steel">ROLE</dt>
        <dd>
          <span className={user.role === 'ADMIN' ? 'chip chip-active' : 'chip'}>
            {user.role}
          </span>
        </dd>
        <dt className="text-steel">CREATED</dt>
        <dd className="text-ink">{formatDate(user.createdAt)}</dd>
        <dt className="text-steel">ACTIVE</dt>
        <dd className="text-ink">{String(user.isActive)}</dd>
      </dl>
      <p className="mt-6 text-sm text-steel">
        资料编辑(头像 / bio / 改密)放到 M5 / M7。
      </p>
    </div>
  )
}
