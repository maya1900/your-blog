import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, PenSquare, BookOpen, Tag as TagIcon } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { useAuthStore } from '@/stores/auth.store'
import { ArticleList } from '@/components/ArticleList'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { useUrlNumberParam } from '@/hooks/useUrlParam'

const PAGE_SIZE = 6

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const [page, setPage] = useUrlNumberParam('page', 1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles', 'home', page],
    queryFn: () => listArticles({ pageSize: PAGE_SIZE, page }),
    placeholderData: (prev) => prev,
  })

  return (
    <>
      {/* === Hero === */}
      <section className="relative overflow-hidden border-b border-whisper">
        <div className="absolute inset-0 hairline-grid pointer-events-none" />
        <div className="absolute -left-[180px] -top-[180px] w-[720px] h-[720px] rounded-full pointer-events-none aurora-blob aurora-1" />
        <div className="absolute -right-[120px] top-[40px] w-[560px] h-[560px] rounded-full pointer-events-none aurora-blob aurora-2" />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 py-20 md:py-24">
          <p className="font-mono text-xs text-steel tracking-[0.04em] mb-6 inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
            EST. 2026 · A SLOW BLOG
          </p>
          <h1 className="text-[clamp(2.5rem,5.5vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.035em]">
            写点想说的{user ? <>,</> : null}
            <br />
            做点想做的事。
          </h1>
          <p className="mt-6 text-lg text-steel max-w-md leading-relaxed">
            一个慢工出细活的技术博客。
            <br />
            {user
              ? `欢迎回来,${user.username}。`
              : '这里写代码、写思考、写做错的事。'}
          </p>
          <div className="mt-9 flex items-center gap-3 flex-wrap">
            <a href="#latest" className="btn-primary">
              开始阅读
              <ArrowRight size={16} />
            </a>
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

          {/* Quick links into the new M3 surfaces */}
          <div className="mt-12 flex items-center gap-6 font-mono text-xs text-steel flex-wrap">
            <Link
              to="/categories"
              className="inline-flex items-center gap-2 hover:text-klein transition"
            >
              <BookOpen size={14} />
              所有分类
            </Link>
            <span className="w-px h-3 bg-whisper" />
            <Link
              to="/tags"
              className="inline-flex items-center gap-2 hover:text-klein transition"
            >
              <TagIcon size={14} />
              所有标签
            </Link>
            <span className="w-px h-3 bg-whisper" />
            <span>
              已发布{' '}
              <span className="text-ink font-medium">{data?.total ?? '—'}</span> 篇
            </span>
          </div>
        </div>
      </section>

      {/* === Section divider === */}
      <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 pt-16" id="latest">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">最新文章</h2>
          <span className="font-mono text-xs text-steel">
            {data ? `${data.items.length} / ${data.total}` : '—'}
          </span>
        </div>
        <p className="mt-2 text-sm text-steel">
          按发布时间倒序。每一篇都是慢慢写出来的,值得慢慢读。
        </p>
      </div>

      {/* === List === */}
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 pb-16">
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
          <>
            <ArticleList
              items={data.items}
              total={data.total}
              startIndex={(page - 1) * PAGE_SIZE}
            />
            <div className="mt-12">
              <Pagination
                page={page}
                pageCount={data.pageCount}
                onChange={(p) => {
                  setPage(p)
                  window.scrollTo({ top: document.getElementById('latest')?.offsetTop ?? 0, behavior: 'smooth' })
                }}
                compact
              />
            </div>
          </>
        )}
      </main>
    </>
  )
}
