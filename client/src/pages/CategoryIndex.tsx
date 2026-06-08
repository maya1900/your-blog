import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen } from 'lucide-react'
import { listCategories } from '@/api/taxonomy'

export function CategoryIndexPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 10 * 60 * 1000,
  })

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <header className="mb-10">
        <p className="font-mono text-xs text-steel tracking-[0.04em] mb-3 inline-flex items-center gap-2">
          <BookOpen size={13} />
          CATEGORIES
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">所有分类</h1>
        <p className="mt-2 text-steel">按主题浏览所有已发布文章</p>
      </header>

      {isLoading && <p className="text-steel font-mono text-sm">LOADING…</p>}
      {isError && <p className="text-red-600">加载失败</p>}

      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((c) => {
            const count = c._count?.articles ?? 0
            return (
              <Link
                key={c.id}
                to={`/categories/${c.slug}`}
                className="group bg-surface border border-whisper rounded-xl p-6 transition hover:border-klein hover:-translate-y-0.5"
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-xs text-steel tracking-[0.04em] uppercase">
                    {c.slug}
                  </span>
                  <span className="font-mono text-2xl font-semibold text-ink tracking-tight">
                    {count}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight group-hover:text-klein">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-steel">
                  {count > 0 ? `${count} 篇文章` : '暂无文章'}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-klein opacity-0 group-hover:opacity-100 transition">
                  浏览 <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
