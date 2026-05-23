import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Eye, PenSquare } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { useAuthStore } from '@/stores/auth.store'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { formatDate, estimateReadTime } from '@/utils/format'

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles', 'home'],
    queryFn: () => listArticles({ pageSize: 12 }),
  })

  return (
    <>
      {/* Compact M2 hero — full marketing hero lands in M3 */}
      <section className="relative overflow-hidden border-b border-whisper">
        <div className="absolute inset-0 hairline-grid pointer-events-none" />
        <div className="absolute -left-[120px] -top-[80px] w-[620px] h-[620px] rounded-full pointer-events-none aurora-blob aurora-1" />
        <div className="absolute -right-[80px] top-[40px] w-[480px] h-[480px] rounded-full pointer-events-none aurora-blob aurora-2" />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 py-16 md:py-20">
          <p className="font-mono text-xs text-steel tracking-[0.04em] mb-5 inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
            EST. 2026 · A SLOW BLOG
          </p>
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em]">
            写点想说的{user && <>,</>}<br />
            做点想做的事。
          </h1>
          <p className="mt-5 text-steel max-w-md">
            一个慢工出细活的技术博客。{user ? `欢迎回来,${user.username}。` : '这里写代码、写思考、写做错的事。'}
          </p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link to="#latest" className="btn-primary">
              开始阅读
              <ArrowRight size={16} />
            </Link>
            {user ? (
              <Link to="/write" className="btn-secondary">
                <PenSquare size={14} />
                写文章
              </Link>
            ) : (
              <Link to="/register" className="btn-secondary">
                注册账号
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Article list */}
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 py-12" id="latest">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">最新文章</h2>
          <span className="font-mono text-xs text-steel">
            {data ? `${data.items.length} / ${data.total}` : '—'}
          </span>
        </div>

        {isLoading && <p className="text-steel font-mono text-sm py-8">LOADING…</p>}
        {isError && <p className="text-red-600 py-8">加载失败</p>}

        {data && data.items.length === 0 && (
          <EmptyState
            title="还没有文章"
            description="成为第一个发布者"
            action={
              user ? (
                <Link to="/write" className="btn-primary !py-2 !px-4 text-sm">
                  <PenSquare size={14} />
                  写第一篇
                </Link>
              ) : (
                <Link to="/login" className="btn-primary !py-2 !px-4 text-sm">
                  登录后写文章
                </Link>
              )
            }
          />
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-0">
            {data.items.map((a, idx) => {
              const imageRight = idx % 2 === 1
              return (
                <Link
                  to={`/articles/${a.slug}`}
                  key={a.id}
                  className="group grid md:grid-cols-12 gap-6 md:gap-10 items-center py-8 border-b border-whisper last:border-b-0 transition"
                >
                  <div
                    className={`md:col-span-5 rounded-xl overflow-hidden border border-whisper bg-whisper-soft ${imageRight ? 'md:order-2' : ''}`}
                  >
                    {a.coverUrl ? (
                      <img
                        src={a.coverUrl}
                        alt=""
                        className="w-full aspect-[16/9] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full aspect-[16/9] flex items-center justify-center text-steel font-mono text-xs">
                        NO COVER
                      </div>
                    )}
                  </div>

                  <div className={`md:col-span-7 ${imageRight ? 'md:order-1' : ''}`}>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="font-mono text-xs text-klein tracking-[0.04em]">
                        {String(idx + 1).padStart(2, '0')} / {String(data.items.length).padStart(2, '0')}
                      </span>
                      <span className="w-6 h-px bg-whisper" />
                      <span className="font-mono text-xs text-steel tracking-[0.04em] uppercase">
                        {a.category.name}
                      </span>
                      {a.status === 'DRAFT' && <StatusBadge status="DRAFT" />}
                    </div>
                    <h3 className="text-[clamp(1.25rem,2vw,1.625rem)] font-semibold leading-[1.25] tracking-[-0.015em] transition-colors group-hover:text-klein">
                      {a.title}
                    </h3>
                    {a.summary && (
                      <p className="mt-3 text-[0.9375rem] leading-[1.6] text-steel line-clamp-2 max-w-xl">
                        {a.summary}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {a.tags.slice(0, 3).map((t) => (
                        <span key={t.id} className="chip">
                          {t.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between max-w-xl">
                      <div className="flex items-center gap-2 text-sm text-steel">
                        <div className="w-5 h-5 rounded-full ring-1 ring-whisper overflow-hidden bg-whisper-soft">
                          {a.author.avatar && (
                            <img src={a.author.avatar} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="text-[13px]">{a.author.username}</span>
                        <span className="text-whisper">·</span>
                        <span className="font-mono text-xs">
                          {estimateReadTime(a.content)} 分钟 · {formatDate(a.publishedAt ?? a.createdAt)}
                        </span>
                        {a.viewCount > 0 && (
                          <>
                            <span className="text-whisper">·</span>
                            <span className="font-mono text-xs inline-flex items-center gap-1">
                              <Eye size={12} />
                              {a.viewCount.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                        <span className="hidden sm:inline">阅读</span>
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-200 group-hover:translate-x-1.5"
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
