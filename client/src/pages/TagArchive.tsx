import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Tag as TagIcon } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { ArticleList } from '@/components/ArticleList'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { useUrlNumberParam } from '@/hooks/useUrlParam'

const PAGE_SIZE = 6

export function TagArchivePage() {
  const { name: rawName } = useParams<{ name: string }>()
  const tagName = decodeURIComponent(rawName ?? '')
  const [page, setPage] = useUrlNumberParam('page', 1)

  const { data, isLoading } = useQuery({
    queryKey: ['articles', 'tag', tagName, page],
    queryFn: () => listArticles({ tag: tagName, pageSize: PAGE_SIZE, page }),
    enabled: !!tagName,
    placeholderData: (prev) => prev,
  })

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <header className="mb-12">
        <Link
          to="/tags"
          className="font-mono text-xs text-steel tracking-[0.04em] inline-flex items-center gap-1.5 hover:text-ink mb-4"
        >
          <ArrowLeft size={12} />
          所有标签
        </Link>
        <div className="flex items-baseline gap-4 flex-wrap">
          <TagIcon size={26} strokeWidth={1.5} className="text-klein" />
          <h1 className="text-3xl font-semibold tracking-tight">#{tagName}</h1>
          <span className="font-mono text-sm text-steel">
            {data ? `${data.total} 篇` : '—'}
          </span>
        </div>
      </header>

      {isLoading && <p className="text-steel font-mono text-sm py-8">LOADING…</p>}

      {data && data.items.length === 0 && (
        <EmptyState
          title="该标签下没有文章"
          description={`没有标记为「${tagName}」的已发布文章`}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <ArticleList items={data.items} total={data.total} startIndex={(page - 1) * PAGE_SIZE} />
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
    </div>
  )
}
