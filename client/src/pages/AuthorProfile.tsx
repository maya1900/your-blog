import { useParams } from 'react-router-dom'
import { Link } from '@/components/Link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { getUserByUsername } from '@/api/users'
import { ArticleList } from '@/components/ArticleList'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'
import { useUrlNumberParam } from '@/hooks/useUrlParam'
import { formatDate } from '@/utils/format'
import { displayName } from '@/utils/displayName'

const PAGE_SIZE = 6

export function AuthorProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [page, setPage] = useUrlNumberParam('page', 1)

  const userQuery = useQuery({
    queryKey: ['user', username],
    queryFn: () => getUserByUsername(username!),
    enabled: !!username,
  })

  const articlesQuery = useQuery({
    queryKey: ['articles', 'author', userQuery.data?.id, page],
    queryFn: () =>
      listArticles({
        authorId: userQuery.data!.id,
        status: 'PUBLISHED',
        pageSize: PAGE_SIZE,
        page,
      }),
    enabled: !!userQuery.data?.id,
    placeholderData: (prev) => prev,
  })

  if (userQuery.isLoading) {
    return (
      <p className="max-w-[1080px] mx-auto px-6 md:px-10 py-16 text-steel font-mono text-sm">
        LOADING…
      </p>
    )
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-16 text-center">
        <p className="font-mono text-xs text-steel tracking-[0.04em] mb-4">404</p>
        <h1 className="text-2xl font-semibold mb-2">用户不存在</h1>
        <Link to="/" className="btn-secondary inline-flex mt-4">
          <ArrowLeft size={14} />
          回首页
        </Link>
      </div>
    )
  }

  const user = userQuery.data
  const data = articlesQuery.data
  const name = displayName(user)

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <header className="mb-12 flex items-start gap-6 flex-wrap">
        <Avatar username={name} avatar={user.avatar} size={96} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
            <span className="font-mono text-xs text-steel">@{user.username}</span>
          </div>
          {user.bio && (
            <p className="mt-3 text-steel max-w-2xl leading-relaxed">{user.bio}</p>
          )}
          <div className="mt-4 flex items-center gap-5 font-mono text-xs text-steel flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} />
              加入于 {formatDate(user.createdAt)}
            </span>
            <span className="text-whisper">·</span>
            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} />
              {user.articleCount} 篇已发布
            </span>
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-mono text-xs text-steel tracking-[0.08em] uppercase">
            Articles
          </h2>
          {data && (
            <span className="font-mono text-xs text-steel">
              {data.total > 0
                ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data.total)} / ${data.total}`
                : ''}
            </span>
          )}
        </div>

        {articlesQuery.isLoading && (
          <p className="text-steel font-mono text-sm py-8">LOADING…</p>
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title="还没有公开发布的文章"
            description={`${name} 暂时没有可阅读的文章`}
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
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                compact
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
