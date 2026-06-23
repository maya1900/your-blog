import { useMemo } from 'react'
import { Link } from '@/components/Link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Search as SearchIcon, Trash2 } from 'lucide-react'
import { listAllComments, type AdminComment } from '@/api/admin'
import { deleteComment } from '@/api/comments'
import { useDebounce } from '@/hooks/useDebounce'
import { useUrlNumberParam, useUrlParam } from '@/hooks/useUrlParam'
import { formatDate } from '@/utils/format'
import { Pagination } from '@/components/Pagination'
import { Avatar } from '@/components/Avatar'
import { displayName } from '@/utils/displayName'

export function AdminCommentsPage() {
  const [keyword, setKeyword] = useUrlParam('keyword', '')
  const [page, setPage] = useUrlNumberParam('page', 1)
  const pageSize = 15
  const debouncedKeyword = useDebounce(keyword, 300)

  const qc = useQueryClient()

  const params = useMemo(
    () => ({ page, pageSize, keyword: debouncedKeyword || undefined }),
    [page, debouncedKeyword],
  )

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'comments', params],
    queryFn: () => listAllComments(params),
  })

  const removeMu = useMutation({
    mutationFn: (c: AdminComment) => deleteComment(c.article.id, c.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: Error) => alert(err.message),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = data?.pageCount ?? 1

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">评论管理</h2>
          <p className="mt-1 text-steel">
            全平台评论 · 共 <span className="font-mono text-ink">{total}</span> 条
          </p>
        </div>
        <div className="relative w-[280px]">
          <SearchIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              if (page !== 1) setPage(1)
            }}
            placeholder="按内容搜索…"
            className="admin-input pl-9 w-full"
          />
        </div>
      </div>

      <div className="bg-surface border border-whisper rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>CONTENT</th>
              <th>ARTICLE</th>
              <th>DATE</th>
              <th className="text-right" style={{ width: 80 }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-steel">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-steel">
                  {debouncedKeyword ? '没有匹配的评论' : '还没有评论'}
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar username={displayName(c.user)} avatar={c.user.avatar} size={28} />
                      <span className="text-sm">{displayName(c.user)}</span>
                    </div>
                  </td>
                  <td>
                    <p className="text-sm text-ink line-clamp-2 max-w-[420px]">
                      {c.content}
                    </p>
                  </td>
                  <td>
                    <Link
                      to={`/articles/${c.article.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-klein hover:text-klein-deep line-clamp-1 max-w-[220px]"
                    >
                      {c.article.title}
                      <ExternalLink size={12} className="shrink-0" />
                    </Link>
                  </td>
                  <td className="font-mono text-[13px] text-steel">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-icon !w-8 !h-8 hover:!bg-red-50 hover:!text-red-600"
                      onClick={() => {
                        if (window.confirm('确认删除这条评论?')) removeMu.mutate(c)
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-mono text-[13px] text-steel">
          显示{' '}
          {items.length === 0
            ? 0
            : `${(page - 1) * pageSize + 1} - ${(page - 1) * pageSize + items.length}`}{' '}
          / 共 {total} 条
        </p>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        <div className="w-[120px]" />
      </div>
    </div>
  )
}
