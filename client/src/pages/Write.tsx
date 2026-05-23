import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Eye, EyeOff, Trash2 } from 'lucide-react'
import {
  createArticle,
  deleteArticle,
  getArticleById,
  publishArticle,
  updateArticle,
  type ArticleInput,
} from '@/api/articles'
import { listCategories } from '@/api/taxonomy'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuthStore } from '@/stores/auth.store'
import { estimateReadTime } from '@/utils/format'

const TAG_MAX = 6

export function WritePage() {
  const { id: idParam } = useParams<{ id?: string }>()
  const editingId = idParam ? Number(idParam) : undefined
  const isEdit = !!editingId
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // Form state — lightweight controlled inputs (MDEditor isn't RHF-friendly,
  // so we keep things simple instead of fighting wrappers).
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState<string>('')
  const [coverUrl, setCoverUrl] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  // Load categories
  const catQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 10 * 60 * 1000,
  })

  // Load existing article in edit mode
  const articleQuery = useQuery({
    queryKey: ['article', 'by-id', editingId],
    queryFn: () => getArticleById(editingId!),
    enabled: !!editingId,
  })

  // Default category to "前端" once categories arrive (new-article mode only)
  useEffect(() => {
    if (!isEdit && categoryId === undefined && catQuery.data && catQuery.data.length > 0) {
      setCategoryId(catQuery.data[0]!.id)
    }
  }, [isEdit, categoryId, catQuery.data])

  // Hydrate edit form when the article loads
  useEffect(() => {
    if (!articleQuery.data) return
    const a = articleQuery.data
    setTitle(a.title)
    setSummary(a.summary ?? '')
    setContent(a.content)
    setCoverUrl(a.coverUrl ?? '')
    setCategoryId(a.categoryId)
    setTags(a.tags.map((t) => t.name))
  }, [articleQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (payload: ArticleInput) => {
      return isEdit ? updateArticle(editingId!, payload) : createArticle(payload)
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['articles'] })
      qc.invalidateQueries({ queryKey: ['article'] })
      qc.invalidateQueries({ queryKey: ['my-articles'] })
      if (!isEdit) {
        navigate(`/write/${saved.id}`, { replace: true })
      }
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      // Ensure latest fields are persisted, then flip status to PUBLISHED.
      if (isEdit) {
        await updateArticle(editingId!, buildPayload())
        return publishArticle(editingId!)
      }
      // New article: create as PUBLISHED in one shot
      return createArticle({ ...buildPayload(), status: 'PUBLISHED' })
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['articles'] })
      qc.invalidateQueries({ queryKey: ['article'] })
      qc.invalidateQueries({ queryKey: ['my-articles'] })
      navigate(`/articles/${saved.slug}`)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteArticle(editingId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['articles'] })
      qc.invalidateQueries({ queryKey: ['my-articles'] })
      navigate('/me')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  function buildPayload(): ArticleInput {
    return {
      title: title.trim(),
      summary: summary.trim() || undefined,
      content,
      coverUrl: coverUrl.trim() || undefined,
      categoryId: categoryId!,
      tags,
      status: articleQuery.data?.status ?? 'DRAFT',
    }
  }

  function validate(): boolean {
    setFormError(null)
    if (!title.trim()) return setFormError('请填写标题'), false
    if (!content.trim()) return setFormError('请填写正文'), false
    if (!categoryId) return setFormError('请选择分类'), false
    return true
  }

  function handleSaveDraft() {
    if (!validate()) return
    saveMutation.mutate({ ...buildPayload(), status: 'DRAFT' })
  }

  function handlePublish() {
    if (!validate()) return
    publishMutation.mutate()
  }

  function handleDelete() {
    if (!isEdit) return
    if (!window.confirm('确定删除这篇文章吗?此操作不可撤销。')) return
    deleteMutation.mutate()
  }

  function handleTagKeydown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = tagDraft.trim().replace(/,$/, '')
      if (!value) return
      if (tags.includes(value)) {
        setTagDraft('')
        return
      }
      if (tags.length >= TAG_MAX) {
        setFormError(`标签最多 ${TAG_MAX} 个`)
        return
      }
      setTags([...tags, value])
      setTagDraft('')
    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
      // Pop last tag on backspace in an empty input
      setTags(tags.slice(0, -1))
    }
  }

  function removeTag(name: string) {
    setTags(tags.filter((t) => t !== name))
  }

  const wordCount = content.length
  const readTime = estimateReadTime(content)
  const status = articleQuery.data?.status ?? 'DRAFT'
  const isSaving = saveMutation.isPending || publishMutation.isPending

  if (isEdit && articleQuery.isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <p className="text-steel font-mono text-sm">LOADING…</p>
      </div>
    )
  }

  if (isEdit && articleQuery.isError) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <p className="text-red-600">无法加载文章 — {(articleQuery.error as Error).message}</p>
        <Link to="/me" className="btn-secondary mt-4 inline-flex">
          返回个人中心
        </Link>
      </div>
    )
  }

  // Guard: edit mode requires ownership (server enforces too, this is UX)
  if (isEdit && articleQuery.data && user && articleQuery.data.authorId !== user.id && user.role !== 'ADMIN') {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        <p className="text-red-600">无权编辑该文章</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 md:px-10 pt-10 pb-28">
        {/* Page head */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="font-mono text-xs text-steel tracking-[0.04em] mb-2">
              <Link to="/me" className="hover:text-ink">
                个人中心
              </Link>
              <span className="mx-2 text-whisper">/</span>
              <span className="text-ink">{isEdit ? '编辑文章' : '写文章'}</span>
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isEdit ? title || '编辑文章' : '新文章'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="btn-icon hover:!bg-red-50 hover:!text-red-600"
                title="删除文章"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-5">
          <label className="field-label">TITLE</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给文章起一个标题"
            maxLength={100}
            className="input !text-[28px] !font-semibold tracking-tight !py-3.5"
          />
        </div>

        {/* Summary */}
        <div className="mb-8">
          <label className="field-label">
            SUMMARY{' '}
            <span className="text-whisper">·</span>{' '}
            <span className="font-sans normal-case tracking-normal text-steel font-normal">
              可选,留空将自动截取正文前 120 字
            </span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="一句话概括,在列表和分享时展示"
            className="input resize-y min-h-[72px]"
          />
        </div>

        {/* Settings grid */}
        <div className="grid md:grid-cols-12 gap-4 mb-8">
          {/* Cover URL */}
          <div className="md:col-span-7">
            <label className="field-label">COVER URL</label>
            <div className="flex items-center gap-3">
              {coverUrl && (
                <div className="w-24 h-16 rounded-md overflow-hidden border border-whisper bg-whisper-soft flex-shrink-0">
                  <img
                    src={coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://… (M5 后支持本地上传)"
                className="input"
              />
            </div>
          </div>

          {/* Category */}
          <div className="md:col-span-3">
            <label className="field-label">CATEGORY</label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="input cursor-pointer"
            >
              <option value="" disabled>
                选择分类
              </option>
              {catQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Read time (auto) */}
          <div className="md:col-span-2">
            <label className="field-label">READ TIME</label>
            <div className="input flex items-center justify-center text-steel font-mono text-sm cursor-default">
              约 {readTime} 分钟
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-10">
          <label className="field-label">
            TAGS{' '}
            <span className="text-whisper">·</span>{' '}
            <span className="font-sans normal-case tracking-normal text-steel font-normal">
              回车或逗号添加,最多 {TAG_MAX} 个
            </span>
          </label>
          <div className="input flex items-center flex-wrap gap-2 !py-2 !px-2.5 min-h-[44px]">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 h-[22px] px-2 rounded-chip bg-whisper-soft text-steel text-xs font-medium tracking-[0.02em]"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-sm opacity-60 hover:opacity-100 hover:bg-black/10"
                  aria-label={`移除 ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKeydown}
              placeholder={tags.length === 0 ? '输入标签后回车' : ''}
              className="flex-1 min-w-[140px] outline-none bg-transparent text-sm"
            />
          </div>
        </div>

        {/* Editor */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="field-label !mb-0">MARKDOWN BODY</label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-steel">
                {wordCount.toLocaleString()} 字 · {readTime} 分钟
              </span>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="btn-icon"
                title={showPreview ? '收起预览' : '显示预览'}
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* MDEditor: data-color-mode forces light theme regardless of OS pref. */}
          <div data-color-mode="light" className="md-editor-shell">
            <MDEditor
              value={content}
              onChange={(v) => setContent(v ?? '')}
              height={520}
              preview={showPreview ? 'live' : 'edit'}
              visibleDragbar={false}
            />
          </div>

          <p className="mt-3 font-mono text-xs text-steel">
            提示 · 粘贴图片或拖入文件功能将在 M5 接入
          </p>
        </div>

        {formError && (
          <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
      </main>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-30 backdrop-blur-md bg-white/85 border-t border-whisper">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-steel font-mono text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-signal" />
              {saveMutation.isPending
                ? '保存中…'
                : publishMutation.isPending
                  ? '发布中…'
                  : status === 'PUBLISHED'
                    ? '已发布'
                    : '草稿'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="btn-secondary"
            >
              {status === 'PUBLISHED' ? '保存修改' : '保存草稿'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSaving}
              className="btn-primary !py-2 !px-4 text-sm"
            >
              {status === 'PUBLISHED' ? '更新发布' : '发布'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
