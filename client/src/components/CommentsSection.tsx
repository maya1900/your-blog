import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  createComment,
  deleteComment,
  listComments,
} from '@/api/comments'
import type { Article } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate } from '@/utils/format'
import { Avatar } from './Avatar'

interface Props {
  article: Article
}

export function CommentsSection({ article }: Props) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['comments', article.id],
    queryFn: () => listComments(article.id, { pageSize: 50 }),
  })

  const createMutation = useMutation({
    mutationFn: (content: string) => createComment(article.id, content),
    onSuccess: () => {
      setDraft('')
      setFormError(null)
      qc.invalidateQueries({ queryKey: ['comments', article.id] })
      // Article _count.comments lives in the detail cache; bump it
      qc.setQueryData<Article>(['article', 'slug', article.slug], (prev) =>
        prev
          ? { ...prev, _count: { ...prev._count, comments: prev._count.comments + 1 } }
          : prev,
      )
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteComment(article.id, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', article.id] })
      qc.setQueryData<Article>(['article', 'slug', article.slug], (prev) =>
        prev
          ? {
              ...prev,
              _count: { ...prev._count, comments: Math.max(0, prev._count.comments - 1) },
            }
          : prev,
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = draft.trim()
    if (!value) return setFormError('评论不能为空')
    createMutation.mutate(value)
  }

  const canDelete = (commentUserId: number) =>
    !!user && (user.id === commentUserId || user.id === article.authorId || user.role === 'ADMIN')

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0

  return (
    <section className="mt-20 border-t border-whisper pt-16">
      <div className="flex items-baseline justify-between mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          评论 <span className="font-mono text-sm text-steel ml-2">{total}</span>
        </h2>
      </div>

      {/* Composer */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="border border-whisper rounded-xl bg-white p-5 mb-10 max-w-[768px]"
        >
          <div className="flex items-start gap-3">
            <Avatar username={user.username} avatar={user.avatar} size={32} />
            <div className="flex-1">
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="说点什么…"
                maxLength={1000}
                className="w-full text-sm text-ink placeholder-steel resize-none outline-none bg-transparent"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSubmit(e)
                  }
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-xs text-steel">
                  Cmd+Enter 发送 · {draft.length} / 1000
                </p>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary !py-2 !px-4 text-sm"
                >
                  {createMutation.isPending ? '发布中…' : '发布评论'}
                </button>
              </div>
              {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
            </div>
          </div>
        </form>
      ) : (
        <div className="border border-dashed border-whisper rounded-xl p-5 mb-10 max-w-[768px] text-center">
          <p className="text-sm text-steel">
            <Link to="/login" className="text-klein hover:text-klein-deep font-medium">
              登录
            </Link>{' '}
            后参与评论
          </p>
        </div>
      )}

      {/* List */}
      {listQuery.isLoading && <p className="font-mono text-sm text-steel">LOADING…</p>}

      {items.length === 0 && !listQuery.isLoading && (
        <p className="text-steel max-w-[768px] text-center py-8">还没有评论,来说点什么。</p>
      )}

      <ul className="space-y-6 max-w-[768px]">
        {items.map((c) => (
          <li key={c.id} className="pb-6 border-b border-whisper">
            <div className="flex items-start gap-3">
              <Avatar username={c.user.username} avatar={c.user.avatar} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-ink">{c.user.username}</span>
                  {c.user.id === article.authorId && (
                    <span className="chip chip-active !h-[18px] !px-1.5 !text-[10px]">作者</span>
                  )}
                  <span className="font-mono text-xs text-steel">
                    · {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words">
                  {c.content}
                </p>
                {canDelete(c.user.id) && (
                  <button
                    onClick={() => {
                      if (window.confirm('确定删除这条评论?')) {
                        deleteMutation.mutate(c.id)
                      }
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-steel hover:text-red-600 transition"
                  >
                    <Trash2 size={11} />
                    删除
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
