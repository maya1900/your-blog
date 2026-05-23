import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { listCategories } from '@/api/taxonomy'
import { ArticleList } from '@/components/ArticleList'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { useUrlNumberParam } from '@/hooks/useUrlParam'

const PAGE_SIZE = 6

export function CategoryArchivePage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useUrlNumberParam('page', 1)

  // Look up the category by slug to get the id we need for the article query.
  // Cached for 10 min, shared across the app.
  const catQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 10 * 60 * 1000,
  })
  const category = catQuery.data?.find((c) => c.slug === slug)

  const articlesQuery = useQuery({
    queryKey: ['articles', 'category', category?.id, page],
    queryFn: () =>
      listArticles({
        categoryId: category!.id,
        pageSize: PAGE_SIZE,
        page,
      }),
    enabled: !!category,
    placeholderData: (prev) => prev,
  })

  if (catQuery.isLoading) {
    return <p className="max-w-[1080px] mx-auto px-6 md:px-10 py-16 text-steel font-mono text-sm">LOADING…</p>
  }
  if (!category) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-16 text-center">
        <p className="font-mono text-xs text-steel tracking-[0.04em] mb-4">404</p>
        <h1 className="text-2xl font-semibold mb-2">分类不存在</h1>
        <Link to="/categories" className="btn-secondary inline-flex mt-4">
          <ArrowLeft size={14} />
          返回分类列表
        </Link>
      </div>
    )
  }

  const data = articlesQuery.data

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <header className="mb-12">
        <Link
          to="/categories"
          className="font-mono text-xs text-steel tracking-[0.04em] inline-flex items-center gap-1.5 hover:text-ink mb-4"
        >
          <ArrowLeft size={12} />
          所有分类
        </Link>
        <div className="flex items-baseline gap-4 flex-wrap">
          <BookOpen size={28} strokeWidth={1.5} className="text-klein" />
          <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
          <span className="font-mono text-sm text-steel">
            {data ? `${data.total} 篇` : '—'}
          </span>
        </div>
      </header>

      {articlesQuery.isLoading && <p className="text-steel font-mono text-sm py-8">LOADING…</p>}

      {data && data.items.length === 0 && (
        <EmptyState
          title="该分类下还没有文章"
          description={`「${category.name}」分类正在等待第一篇文章`}
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
