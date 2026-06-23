import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from '@/components/Link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Eye,
  Pencil,
  Plus,
  Search as SearchIcon,
  Send,
  Trash2,
} from 'lucide-react'
import {
  deleteArticle,
  listArticles,
  publishArticle,
  type ListArticlesParams,
} from '@/api/articles'
import { listCategories } from '@/api/taxonomy'
import { Pagination } from '@/components/Pagination'
import { Avatar } from '@/components/Avatar'
import { useDebounce } from '@/hooks/useDebounce'
import { useUrlNumberParam, useUrlParam } from '@/hooks/useUrlParam'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { displayName } from '@/utils/displayName'
import type { Article, ArticleStatus } from '@/types/api'

export function AdminArticlesPage() {
  const [keyword, setKeyword] = useUrlParam('keyword', '')
  const [statusFilter, setStatusFilter] = useUrlParam('status', '')
  const [categoryFilter, setCategoryFilter] = useUrlParam('categoryId', '')
  const [page, setPage] = useUrlNumberParam('page', 1)
  const pageSize = 10
  const debouncedKeyword = useDebounce(keyword, 300)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const navigate = useNavigate()
  const qc = useQueryClient()

  const params: ListArticlesParams = useMemo(
    () => ({
      page,
      pageSize,
      keyword: debouncedKeyword || undefined,
      status: (statusFilter || undefined) as ArticleStatus | undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
    }),
    [page, debouncedKeyword, statusFilter, categoryFilter],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'articles', params],
    queryFn: () => listArticles(params),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = data?.pageCount ?? 1

  const deleteMu = useMutation({
    mutationFn: (id: number) => deleteArticle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })

  const publishMu = useMutation({
    mutationFn: (id: number) => publishArticle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })

  const allOnPageSelected =
    items.length > 0 && items.every((a) => selected.has(a.id))
  const someOnPageSelected = items.some((a) => selected.has(a.id))

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) items.forEach((a) => next.delete(a.id))
      else items.forEach((a) => next.add(a.id))
      return next
    })
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    if (!selected.size) return
    if (!window.confirm(`确认删除选中的 ${selected.size} 篇文章?此操作不可撤销。`))
      return
    const ids = Array.from(selected)
    for (const id of ids) {
      try {
        await deleteArticle(id)
      } catch {
        /* keep going */
      }
    }
    setSelected(new Set())
    qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  async function bulkPublish() {
    if (!selected.size) return
    const drafts = items.filter((a) => selected.has(a.id) && a.status === 'DRAFT')
    for (const a of drafts) {
      try {
        await publishArticle(a.id)
      } catch {
        /* keep going */
      }
    }
    setSelected(new Set())
    qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">所有文章</h2>
          <p className="mt-1 text-steel">
            管理平台所有文章 · 共 <span className="font-mono text-ink">{total}</span> 篇
          </p>
        </div>
        <button
          className="btn-primary !py-2 !px-4 text-sm"
          onClick={() => navigate('/write', { viewTransition: true })}
        >
          <Plus size={14} />
          新建文章
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
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
            placeholder="搜索标题..."
            className="admin-input pl-9 w-full"
          />
        </div>

        <SelectField
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
          options={[
            { value: '', label: '所有状态' },
            { value: 'PUBLISHED', label: '已发布' },
            { value: 'DRAFT', label: '草稿' },
          ]}
        />

        <SelectField
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v)
            setPage(1)
          }}
          options={[
            { value: '', label: '所有分类' },
            ...(categories ?? []).map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ]}
        />

        <div className="ml-auto font-mono text-[13px] text-steel">
          {isFetching ? '加载中…' : `共 ${total} 条`}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-klein-tint border border-klein/40 rounded-lg text-sm">
          <span className="font-mono text-[13px] text-klein-deep font-medium">
            已选中 {selected.size} 篇
          </span>
          <span className="w-px h-4 bg-klein/30" />
          <button
            onClick={bulkPublish}
            className="text-sm text-klein hover:text-klein-deep"
          >
            批量发布
          </button>
          <button
            onClick={bulkDelete}
            className="text-sm text-red-600 hover:text-red-700"
          >
            批量删除
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-klein-deep hover:opacity-80 font-mono text-[13px]"
          >
            清除选择 ×
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-whisper rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <Checkbox
                  state={
                    allOnPageSelected
                      ? 'checked'
                      : someOnPageSelected
                        ? 'indeterminate'
                        : 'unchecked'
                  }
                  onToggle={toggleAll}
                />
              </th>
              <th>TITLE</th>
              <th>AUTHOR</th>
              <th>CATEGORY</th>
              <th>STATUS</th>
              <th className="text-right">VIEWS</th>
              <th className="text-right">LIKES</th>
              <th>DATE</th>
              <th className="text-right" style={{ width: 120 }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-steel">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-steel">
                  没有符合条件的文章
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <ArticleRow
                  key={a.id}
                  article={a}
                  selected={selected.has(a.id)}
                  onSelect={() => toggleOne(a.id)}
                  onDelete={() => {
                    if (window.confirm(`确认删除「${a.title}」?`)) {
                      deleteMu.mutate(a.id)
                    }
                  }}
                  onPublish={() => publishMu.mutate(a.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

// ============ Row ============

function ArticleRow({
  article,
  selected,
  onSelect,
  onDelete,
  onPublish,
}: {
  article: Article
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onPublish: () => void
}) {
  return (
    <tr className={cn(selected && 'selected')}>
      <td>
        <Checkbox state={selected ? 'checked' : 'unchecked'} onToggle={onSelect} />
      </td>
      <td>
        <Link
          to={`/articles/${article.slug}`}
          className="font-medium text-ink hover:text-klein line-clamp-1 max-w-[340px] inline-block"
        >
          {article.title}
        </Link>
        <p className="font-mono text-[13px] text-steel mt-0.5">#{article.slug}</p>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Avatar
            username={displayName(article.author)}
            avatar={article.author.avatar}
            size={24}
          />
          <span className="text-sm">{displayName(article.author)}</span>
        </div>
      </td>
      <td>
        <span className="chip">{article.category.name}</span>
      </td>
      <td>
        <span
          className={cn(
            'inline-flex items-center h-[22px] px-2 rounded-chip text-xs font-medium',
            article.status === 'PUBLISHED'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700',
          )}
        >
          {article.status}
        </span>
      </td>
      <td className="text-right font-mono text-[13px]">
        {article.status === 'PUBLISHED' ? article.viewCount : <span className="text-steel">—</span>}
      </td>
      <td className="text-right font-mono text-[13px]">
        {article._count.likes || <span className="text-steel">—</span>}
      </td>
      <td className="font-mono text-[13px] text-steel">
        {formatDate(article.createdAt)}
      </td>
      <td className="text-right">
        <div className="inline-flex items-center gap-1">
          {article.status === 'PUBLISHED' && (
            <Link
              to={`/articles/${article.slug}`}
              className="btn-icon !w-8 !h-8"
              title="查看"
            >
              <Eye size={14} />
            </Link>
          )}
          <Link
            to={`/write/${article.id}`}
            className="btn-icon !w-8 !h-8"
            title="编辑"
          >
            <Pencil size={14} />
          </Link>
          {article.status === 'DRAFT' && (
            <button
              className="btn-icon !w-8 !h-8"
              onClick={onPublish}
              title="发布"
            >
              <Send size={14} />
            </button>
          )}
          <button
            className="btn-icon !w-8 !h-8 hover:!bg-red-50 hover:!text-red-600"
            onClick={onDelete}
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ============ tiny building blocks ============

function Checkbox({
  state,
  onToggle,
}: {
  state: 'checked' | 'unchecked' | 'indeterminate'
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center w-4 h-4 border-[1.5px] rounded transition-colors',
        state === 'unchecked'
          ? 'border-whisper hover:border-klein bg-surface'
          : 'border-klein bg-klein text-white',
      )}
      aria-checked={state === 'checked'}
      role="checkbox"
    >
      {state === 'checked' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {state === 'indeterminate' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  )
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admin-input pr-8 appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel pointer-events-none"
      />
    </div>
  )
}
