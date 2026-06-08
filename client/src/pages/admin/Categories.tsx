import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/api/taxonomy'
import type { Category } from '@/types/api'

interface EditState {
  mode: 'create' | 'edit'
  category?: Category
}

export function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [edit, setEdit] = useState<EditState | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  })

  const removeMu = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err: Error) => alert(err.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">分类管理</h2>
          <p className="mt-1 text-steel">
            管理文章分类 · 共 <span className="font-mono text-ink">{data?.length ?? 0}</span> 个
          </p>
        </div>
        <button
          className="btn-primary !py-2 !px-4 text-sm"
          onClick={() => setEdit({ mode: 'create' })}
        >
          <Plus size={14} />
          新建分类
        </button>
      </div>

      <div className="bg-surface border border-whisper rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>SLUG</th>
              <th className="text-right">ARTICLES</th>
              <th className="text-right" style={{ width: 120 }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-steel">
                  加载中…
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-steel">
                  还没有分类
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="font-medium text-ink">{c.name}</span>
                  </td>
                  <td>
                    <span className="font-mono text-[13px] text-steel">#{c.slug}</span>
                  </td>
                  <td className="text-right font-mono text-[13px]">
                    {c._count?.articles ?? 0}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="btn-icon !w-8 !h-8"
                        onClick={() => setEdit({ mode: 'edit', category: c })}
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon !w-8 !h-8 hover:!bg-red-50 hover:!text-red-600"
                        onClick={() => {
                          if ((c._count?.articles ?? 0) > 0) {
                            alert(
                              `「${c.name}」下还有 ${c._count?.articles} 篇文章,不能删除`,
                            )
                            return
                          }
                          if (window.confirm(`确认删除「${c.name}」?`)) {
                            removeMu.mutate(c.id)
                          }
                        }}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <CategoryEditDialog
          state={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            qc.invalidateQueries({ queryKey: ['categories'] })
          }}
        />
      )}
    </div>
  )
}

function CategoryEditDialog({
  state,
  onClose,
  onSaved,
}: {
  state: EditState
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(state.category?.name ?? '')
  const [slug, setSlug] = useState(state.category?.slug ?? '')
  const [error, setError] = useState<string | null>(null)

  const isEdit = state.mode === 'edit'

  const saveMu = useMutation({
    mutationFn: async () => {
      if (isEdit && state.category) {
        return updateCategory(state.category.id, { name, slug: slug || undefined })
      }
      return createCategory({ name, slug: slug || undefined })
    },
    onSuccess: () => onSaved(),
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-whisper rounded-xl w-full max-w-md p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {isEdit ? '编辑分类' : '新建分类'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="field-label">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如:前端"
              autoFocus
              className="input"
              maxLength={32}
            />
          </div>
          <div>
            <label className="field-label">SLUG(可选,留空自动生成)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="frontend"
              className="input font-mono"
              maxLength={48}
              pattern="[a-z0-9-]+"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary !py-2 !px-4 text-sm"
            disabled={!name.trim() || saveMu.isPending}
            onClick={() => {
              setError(null)
              saveMu.mutate()
            }}
          >
            {saveMu.isPending ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
