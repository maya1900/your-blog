import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Tag as TagIcon } from 'lucide-react'
import { listTags } from '@/api/taxonomy'

export function TagIndexPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
    staleTime: 10 * 60 * 1000,
  })

  // Bucket tags into ranges so the cloud has visual rhythm (more articles
  // = larger / bolder). Avoid the literal "tag cloud" cliché by using a
  // controlled 4-tier scale.
  const tiers = (count: number) => {
    if (count >= 8) return 'text-lg font-semibold'
    if (count >= 4) return 'text-base font-medium'
    if (count >= 2) return 'text-sm'
    return 'text-sm text-steel'
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <header className="mb-10">
        <p className="font-mono text-xs text-steel tracking-[0.04em] mb-3 inline-flex items-center gap-2">
          <TagIcon size={13} />
          TAGS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">所有标签</h1>
        <p className="mt-2 text-steel">字号反映文章数量,点击进入对应归档</p>
      </header>

      {isLoading && <p className="text-steel font-mono text-sm">LOADING…</p>}
      {isError && <p className="text-red-600">加载失败</p>}

      {data && data.length === 0 && (
        <p className="text-steel">还没有标签,写第一篇带标签的文章吧。</p>
      )}

      {data && data.length > 0 && (
        <div className="bg-surface border border-whisper rounded-xl p-8">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
            {data.map((t) => {
              const count = t._count?.articles ?? 0
              return (
                <Link
                  key={t.id}
                  to={`/tags/${encodeURIComponent(t.name)}`}
                  className={`${tiers(count)} text-ink hover:text-klein transition inline-flex items-baseline gap-1`}
                >
                  {t.name}
                  <span className="font-mono text-[10px] text-steel">{count}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
