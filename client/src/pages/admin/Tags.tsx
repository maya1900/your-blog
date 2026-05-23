import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search as SearchIcon, Trash2 } from 'lucide-react'
import { deleteTag, listTags } from '@/api/taxonomy'
import { useDebounce } from '@/hooks/useDebounce'

export function AdminTagsPage() {
  const qc = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 200)

  const { data, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  })

  const filtered = useMemo(() => {
    if (!data) return []
    if (!debouncedKeyword) return data
    const q = debouncedKeyword.toLowerCase()
    return data.filter((t) => t.name.toLowerCase().includes(q))
  }, [data, debouncedKeyword])

  const removeMu = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
    onError: (err: Error) => alert(err.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">标签管理</h2>
          <p className="mt-1 text-steel">
            共 <span className="font-mono text-ink">{data?.length ?? 0}</span> 个标签。
            删除标签会从所有文章中解除关联,但不会删除文章。
          </p>
        </div>
        <div className="relative w-[260px]">
          <SearchIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索标签…"
            className="admin-input pl-9 w-full"
          />
        </div>
      </div>

      <div className="bg-white border border-whisper rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>TAG</th>
              <th className="text-right">ARTICLES</th>
              <th className="text-right" style={{ width: 80 }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-steel">
                  加载中…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-steel">
                  {debouncedKeyword ? '没有匹配的标签' : '还没有标签'}
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="chip">#{t.name}</span>
                  </td>
                  <td className="text-right font-mono text-[13px]">
                    {t._count?.articles ?? 0}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-icon !w-8 !h-8 hover:!bg-red-50 hover:!text-red-600"
                      onClick={() => {
                        if (
                          window.confirm(
                            `删除标签「${t.name}」?这会从 ${t._count?.articles ?? 0} 篇文章中移除该标签。`,
                          )
                        ) {
                          removeMu.mutate(t.id)
                        }
                      }}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
