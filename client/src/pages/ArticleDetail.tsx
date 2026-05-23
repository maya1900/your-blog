import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, Eye, PenSquare, ArrowLeft } from 'lucide-react'
import { getArticleBySlug } from '@/api/articles'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate, estimateReadTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth.store'

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['article', 'slug', slug],
    queryFn: () => getArticleBySlug(slug!),
    enabled: !!slug,
    retry: false,
  })

  const headings = useMemo(() => {
    if (!data?.content) return []
    const matches = data.content.matchAll(/^(##?)\s+(.+)$/gm)
    return Array.from(matches).map((m) => ({
      level: m[1]!.length,
      text: m[2]!.trim(),
    }))
  }, [data?.content])

  if (isLoading) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-20">
        <p className="font-mono text-xs text-steel">LOADING…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-20 text-center">
        <p className="font-mono text-xs text-steel tracking-[0.04em] mb-4">404 · NOT FOUND</p>
        <h1 className="text-2xl font-semibold mb-2">文章不存在</h1>
        <p className="text-steel mb-6">{(error as Error).message}</p>
        <button onClick={() => navigate('/')} className="btn-secondary inline-flex">
          <ArrowLeft size={14} />
          返回首页
        </button>
      </div>
    )
  }

  if (!data) return null

  const canEdit = !!user && (user.id === data.authorId || user.role === 'ADMIN')
  const readTime = estimateReadTime(data.content)

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10">
      {/* Breadcrumb */}
      <p className="font-mono text-xs text-steel pt-8 mb-6">
        <Link to="/" className="hover:text-ink">
          文章
        </Link>
        <span className="mx-2 text-whisper">/</span>
        <Link to={`/categories/${data.category.slug}`} className="hover:text-ink">
          {data.category.name}
        </Link>
      </p>

      {/* Cover */}
      {data.coverUrl && (
        <div className="overflow-hidden rounded-xl border border-whisper mb-10 max-h-[480px]">
          <img
            src={data.coverUrl}
            alt=""
            className="w-full object-cover max-h-[480px]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).parentElement?.classList.add('hidden')
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {data.status === 'DRAFT' && <StatusBadge status="DRAFT" />}
          <span className="chip chip-active">{data.category.name}</span>
          {data.tags.map((t) => (
            <span key={t.id} className="chip">
              {t.name}
            </span>
          ))}
        </div>

        <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
          {data.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-steel">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full ring-1 ring-whisper overflow-hidden bg-whisper-soft">
              {data.author.avatar && (
                <img src={data.author.avatar} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <span className="text-sm font-medium text-ink">{data.author.username}</span>
          </div>
          <span className="font-mono text-xs">{formatDate(data.publishedAt ?? data.createdAt)}</span>
          <span className="font-mono text-xs flex items-center gap-1.5">
            <Clock size={13} />
            {readTime} 分钟阅读
          </span>
          <span className="font-mono text-xs flex items-center gap-1.5">
            <Eye size={13} />
            {data.viewCount.toLocaleString()} 阅读
          </span>

          {canEdit && (
            <Link
              to={`/write/${data.id}`}
              className="ml-auto inline-flex items-center gap-1.5 text-sm text-klein hover:text-klein-deep"
            >
              <PenSquare size={14} />
              编辑
            </Link>
          )}
        </div>

        {data.summary && (
          <p className="mt-7 text-[1.125rem] leading-[1.7] text-steel">{data.summary}</p>
        )}
      </header>

      <div className="border-t border-whisper" />

      {/* Body + Right Rail */}
      <div className="mt-10 grid gap-12 pb-20 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="min-w-0">
          <MarkdownRenderer>{data.content}</MarkdownRenderer>

          <footer className="mt-12 pt-8 border-t border-whisper">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-steel tracking-[0.04em]">TAGS</span>
              {data.tags.map((t) => (
                <Link key={t.id} to={`/tags/${encodeURIComponent(t.name)}`} className="chip">
                  {t.name}
                </Link>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-steel">
              本文链接 · /articles/{data.slug}
            </p>
          </footer>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            {headings.length > 0 && (
              <div>
                <p className="font-mono text-xs text-steel tracking-[0.04em] mb-3">目录 / TOC</p>
                <nav className="border-l border-whisper">
                  {headings.map((h, i) => (
                    <a
                      key={i}
                      href={`#${slugifyHash(h.text)}`}
                      className={`block py-1.5 text-sm text-steel hover:text-ink transition-colors ${
                        h.level === 2 ? 'pl-3' : 'pl-7'
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <div className="border border-whisper rounded-xl p-5 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full ring-1 ring-whisper overflow-hidden bg-whisper-soft">
                  {data.author.avatar && (
                    <img src={data.author.avatar} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-ink">{data.author.username}</p>
                  <p className="font-mono text-xs text-steel">@{data.author.username}</p>
                </div>
              </div>
              <p className="mt-4 font-mono text-xs text-steel">
                M4 将在这里加入「关注 / 查看作者所有文章」
              </p>
            </div>

            <div className="border border-whisper rounded-xl p-3 bg-white">
              <p className="font-mono text-xs text-steel tracking-[0.04em] px-2 pb-2">REACTIONS</p>
              <div className="px-2 py-3 font-mono text-xs text-steel text-center">
                M4 · 点赞 / 收藏
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function slugifyHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
