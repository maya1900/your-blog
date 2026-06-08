import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
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
import { uploadImage } from '@/api/upload'
import { CoverDropzone } from '@/components/CoverDropzone'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuthStore } from '@/stores/auth.store'
import { estimateReadTime } from '@/utils/format'
import { useTheme } from '@/hooks/useTheme'

const TAG_MAX = 6

export function WritePage() {
  const { id: idParam } = useParams<{ id?: string }>()
  const editingId = idParam ? Number(idParam) : undefined
  const isEdit = !!editingId
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { theme } = useTheme()

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
  const [editorHeight, setEditorHeight] = useState(720)
  const [pasteUploading, setPasteUploading] = useState(false)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  // Always read the latest `content` inside paste/drop handlers so we don't
  // splice into stale state when the user pastes multiple images in a row.
  const contentRef = useRef(content)
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Sync MDEditor's `height` prop with any user-resize on the wrapper.
  // We rely on the wrapper having `resize: vertical` (set in className).
  useEffect(() => {
    const el = editorWrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect.height)
        if (h >= 300) setEditorHeight(h)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  /** Insert text at the textarea's caret (or append if no caret). */
  function insertAtCaret(textarea: HTMLTextAreaElement | null, insert: string) {
    const current = contentRef.current
    if (!textarea) {
      setContent(current + (current.endsWith('\n') ? '' : '\n') + insert + '\n')
      return
    }
    const start = textarea.selectionStart ?? current.length
    const end = textarea.selectionEnd ?? current.length
    const next = current.slice(0, start) + insert + current.slice(end)
    setContent(next)
    // Restore caret after React commits the new value.
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + insert.length
      textarea.setSelectionRange(pos, pos)
    })
  }

  async function handleImageUpload(file: File, textarea: HTMLTextAreaElement | null) {
    setPasteUploading(true)
    setFormError(null)
    // Insert a placeholder so the user gets feedback immediately.
    const placeholder = `![uploading…](${file.name})`
    insertAtCaret(textarea, placeholder)
    try {
      const res = await uploadImage(file)
      const finalMd = `![${file.name.replace(/\.[^.]+$/, '')}](${res.url})`
      // Swap placeholder for the real URL (works even if user kept typing).
      setContent((prev) => prev.replace(placeholder, finalMd))
    } catch (err) {
      setContent((prev) => prev.replace(placeholder, ''))
      setFormError((err as Error).message)
    } finally {
      setPasteUploading(false)
    }
  }

  function handleEditorPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (files.length === 0) return
    e.preventDefault()
    const ta = e.currentTarget
    for (const f of files) void handleImageUpload(f, ta)
  }

  function handleEditorDrop(e: DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (files.length === 0) return
    e.preventDefault()
    const ta = e.currentTarget
    for (const f of files) void handleImageUpload(f, ta)
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
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 md:px-10 pt-6 pb-28">
        {/* Page head — compact */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs text-steel tracking-[0.04em]">
              <Link to="/me" className="hover:text-ink">
                个人中心
              </Link>
              <span className="mx-2 text-whisper">/</span>
              <span className="text-ink">{isEdit ? '编辑文章' : '写文章'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="btn-icon hover:!bg-red-50 hover:!text-red-600"
                title="删除文章"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Title — compact, single-line, looks like a heading not a hero input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给文章起一个标题"
          maxLength={100}
          className="w-full bg-transparent border-none outline-none text-2xl md:text-[28px] font-semibold tracking-tight text-ink placeholder:text-steel/40 mb-4 pb-2 border-b border-transparent focus:border-whisper transition-colors"
        />

        {/* Settings strip — category + tags on top row, cover dropzone on its own row */}
        <div className="grid md:grid-cols-12 gap-3 mb-3">
          {/* Category */}
          <div className="md:col-span-3">
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="input cursor-pointer !py-2 !text-sm h-[36px]"
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

          {/* Tags */}
          <div className="md:col-span-9">
            <div className="input flex items-center flex-wrap gap-1.5 !py-1 !px-2 h-[36px] overflow-hidden">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 h-[22px] px-2 rounded-chip bg-whisper-soft text-steel text-xs font-medium tracking-[0.02em] shrink-0"
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
                placeholder={tags.length === 0 ? '标签 · 回车添加,最多 6 个' : ''}
                className="flex-1 min-w-[80px] outline-none bg-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Cover image dropzone */}
        <div className="mb-4">
          <CoverDropzone value={coverUrl} onChange={setCoverUrl} randomQuery={title} />
        </div>

        {/* Summary — collapsed by default, can be a single small textarea */}
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="可选 · 一句话摘要,留空将自动截取正文前 120 字"
          className="input resize-y min-h-[52px] !py-2 !text-sm mb-5"
        />

        {/* Editor */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="font-mono text-xs text-steel tracking-[0.04em]">MARKDOWN BODY</label>
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

          {/* Resizable wrapper. User drags the bottom-right handle;
              ResizeObserver picks up the new height and passes it to MDEditor. */}
          <div
            ref={editorWrapRef}
            data-color-mode={theme}
            className="md-editor-shell resize-y overflow-hidden"
            style={{ height: 720, minHeight: 320, maxHeight: '85vh' }}
          >
            <MDEditor
              value={content}
              onChange={(v) => setContent(v ?? '')}
              height={editorHeight}
              preview={showPreview ? 'live' : 'edit'}
              visibleDragbar={false}
              textareaProps={{
                onPaste: handleEditorPaste,
                onDrop: handleEditorDrop,
                placeholder: '在这里写正文… 粘贴或拖入图片会自动上传',
              }}
            />
          </div>

          <p className="mt-2 font-mono text-xs text-steel">
            提示 · 粘贴 / 拖入图片自动上传 · 右下角拖拽调整高度
            {pasteUploading && (
              <span className="ml-2 text-klein">· 图片上传中…</span>
            )}
          </p>
        </div>

        {formError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
      </main>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-30 backdrop-blur-md bg-surface/85 border-t border-whisper">
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
