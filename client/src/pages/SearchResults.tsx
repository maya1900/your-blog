import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from '@/components/Link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Search } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { ArticleList } from '@/components/ArticleList'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { useUrlNumberParam, useUrlParam } from '@/hooks/useUrlParam'
import { useDebounce } from '@/hooks/useDebounce'

const PAGE_SIZE = 6

export function SearchResultsPage() {
  const [keyword, setKeyword] = useUrlParam('keyword', '')
  const [page, setPage] = useUrlNumberParam('page', 1)
  const debounced = useDebounce(keyword, 300)
  const [, setSearchParams] = useSearchParams()

  // When the debounced keyword changes, reset to page 1 — we don't want
  // a stale "page=4" from a previous search.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (debounced) p.set('keyword', debounced)
        else p.delete('keyword')
        p.delete('page')
        return p
      },
      { replace: true },
    )
    // We intentionally only react to `debounced`. Including setSearchParams
    // creates an infinite loop because React Router returns a new fn each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, isLoading } = useQuery({
    queryKey: ['articles', 'search', debounced, page],
    queryFn: () => listArticles({ keyword: debounced, page, pageSize: PAGE_SIZE }),
    enabled: !!debounced.trim(),
    placeholderData: (prev) => prev,
  })

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <header className="mb-10">
        <Link
          to="/"
          className="font-mono text-xs text-steel tracking-[0.04em] inline-flex items-center gap-1.5 hover:text-ink mb-4"
        >
          <ArrowLeft size={12} />
          返回首页
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">搜索结果</h1>

        <div className="mt-6 relative max-w-xl">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="按标题搜索…"
            className="input pl-10"
          />
        </div>
        {debounced && (
          <p className="mt-3 font-mono text-xs text-steel">
            关键词:<span className="text-ink">{debounced}</span>
            {data ? ` · ${data.total} 条结果` : ''}
          </p>
        )}
      </header>

      {!debounced.trim() ? (
        <EmptyState title="输入关键词开始搜索" description="目前仅在文章标题中匹配" />
      ) : isLoading ? (
        <p className="text-steel font-mono text-sm py-8">LOADING…</p>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="没有找到结果"
          description={`没有标题包含「${debounced}」的文章`}
        />
      ) : data && data.items.length > 0 ? (
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
      ) : null}
    </div>
  )
}
