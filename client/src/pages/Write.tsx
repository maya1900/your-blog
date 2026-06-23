import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from '@/components/Link'
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
import { fetchLinkPreview } from '@/api/linkPreview'
import { CoverDropzone } from '@/components/CoverDropzone'
import {
  filterSlashCommands,
  filterEmoji,
  createMarkdownEditorCommands,
  createMarkdownTable,
  EmojiSuggestMenu,
  getEmojiState,
  getSlashState,
  insertEmoji,
  insertMarkdownAtSelection,
  insertInlineLinkForUrl,
  insertOneboxForUrl,
  insertSlashCommand,
  markdownEditorComponents,
  markdownEditorExtraCommands,
  markdownTemplates,
  MarkdownSlashMenu,
  replaceTextEverywhere,
  type SlashState,
  type EmojiState,
  type TableAlignment,
  type TemplateId,
} from '@/components/MarkdownEditorExtensions'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuthStore } from '@/stores/auth.store'
import { estimateReadTime } from '@/utils/format'
import { useTheme } from '@/hooks/useTheme'

const TAG_MAX = 6
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

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
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [editorHeight, setEditorHeight] = useState(720)
  const [pasteUploading, setPasteUploading] = useState(false)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [slashState, setSlashState] = useState<SlashState | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [emojiState, setEmojiState] = useState<EmojiState | null>(null)
  const [emojiIndex, setEmojiIndex] = useState(0)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [emojiPickerStyle, setEmojiPickerStyle] = useState<CSSProperties | undefined>()
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
  const [activeTemplateId, setActiveTemplateId] = useState<TemplateId>('note')
  const [templateDraft, setTemplateDraft] = useState(markdownTemplates[0]!.content)
  const [tablePanelOpen, setTablePanelOpen] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableColumns, setTableColumns] = useState(4)
  const [tableHoverRows, setTableHoverRows] = useState(3)
  const [tableHoverColumns, setTableHoverColumns] = useState(4)
  const [tableAlignments, setTableAlignments] = useState<TableAlignment[]>([
    'left',
    'left',
    'left',
    'left',
  ])
  const hydratedRef = useRef(false)
  const lastSavedSnapshotRef = useRef('')
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
    const snapshot = JSON.stringify({
      title: a.title,
      summary: a.summary ?? '',
      content: a.content,
      coverUrl: a.coverUrl ?? '',
      categoryId: a.categoryId,
      tags: a.tags.map((t) => t.name),
      status: a.status,
    })
    lastSavedSnapshotRef.current = snapshot
    hydratedRef.current = true
    setSaveState('saved')
    setLastSavedAt(new Date(a.updatedAt))
  }, [articleQuery.data])

  useEffect(() => {
    if (!isEdit && categoryId !== undefined && !hydratedRef.current) {
      hydratedRef.current = true
      lastSavedSnapshotRef.current = currentSnapshot()
      setSaveState('idle')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, categoryId])

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
      lastSavedSnapshotRef.current = currentSnapshot(saved.status)
      setLastSavedAt(new Date(saved.updatedAt))
      setSaveState('saved')
      navigate(`/articles/${saved.slug}`, { viewTransition: true })
    },
    onError: (err: Error) => {
      setSaveState('error')
      setFormError(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteArticle(editingId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['articles'] })
      qc.invalidateQueries({ queryKey: ['my-articles'] })
      navigate('/me', { viewTransition: true })
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

  function currentSnapshot(statusOverride = articleQuery.data?.status ?? 'DRAFT') {
    return JSON.stringify({
      title: title.trim(),
      summary: summary.trim(),
      content,
      coverUrl: coverUrl.trim(),
      categoryId,
      tags,
      status: statusOverride,
    })
  }

  const persistDraft = useCallback(
    async (source: 'manual' | 'auto') => {
      if (!validate()) {
        if (source === 'auto') setSaveState('dirty')
        return null
      }
      const payload = { ...buildPayload(), status: 'DRAFT' as const }
      setSaveState('saving')
      const saved = isEdit ? await updateArticle(editingId!, payload) : await createArticle(payload)
      qc.invalidateQueries({ queryKey: ['articles'] })
      qc.invalidateQueries({ queryKey: ['article'] })
      qc.invalidateQueries({ queryKey: ['my-articles'] })
      lastSavedSnapshotRef.current = currentSnapshot(saved.status)
      setLastSavedAt(new Date(saved.updatedAt))
      setSaveState('saved')
      if (!isEdit) {
        navigate(`/write/${saved.id}`, { replace: true })
      }
      return saved
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, summary, content, coverUrl, categoryId, tags, isEdit, editingId, qc, navigate],
  )

  const saveMutation = useMutation({
    mutationFn: () => persistDraft('manual'),
    onError: (err: Error) => {
      setSaveState('error')
      setFormError(err.message)
    },
  })

  useEffect(() => {
    if (!hydratedRef.current) return
    const snapshot = currentSnapshot()
    if (snapshot === lastSavedSnapshotRef.current) return
    if (saveState !== 'saving') setSaveState('dirty')

    if (!title.trim() || !content.trim() || !categoryId) return
    const timer = window.setTimeout(() => {
      void persistDraft('auto').catch((err: Error) => {
        setSaveState('error')
        setFormError(err.message)
      })
    }, 2500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, content, coverUrl, categoryId, tags, persistDraft])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState !== 'dirty' && saveState !== 'error') return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveState])

  function validate(): boolean {
    setFormError(null)
    if (!title.trim()) return (setFormError('请填写标题'), false)
    if (!content.trim()) return (setFormError('请填写正文'), false)
    if (!categoryId) return (setFormError('请选择分类'), false)
    return true
  }

  function handleSaveDraft() {
    saveMutation.mutate()
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

  function applyContent(next: string) {
    contentRef.current = next
    setContent(next)
  }

  function refreshSlashMenu(textarea: HTMLTextAreaElement) {
    editorTextareaRef.current = textarea
    const next = getSlashState(textarea)
    setSlashState(next)
    setSlashIndex(0)
    const nextEmoji = getEmojiState(textarea)
    setEmojiState(nextEmoji)
    setEmojiIndex(0)
  }

  function closeSlashMenu() {
    setSlashState(null)
    setSlashIndex(0)
  }

  function closeEmojiMenu() {
    setEmojiState(null)
    setEmojiIndex(0)
  }

  const slashCommands = slashState ? filterSlashCommands(slashState.query) : []
  const emojiSuggestions = emojiState ? filterEmoji(emojiState.query) : []
  const emojiPickerItems = filterEmoji('')

  const markdownCommands = useMemo(
    () =>
      createMarkdownEditorCommands(
        (id) => {
          openTemplatePanel(id)
        },
        () => {
          setTablePanelOpen(true)
          setTableHoverRows(tableRows)
          setTableHoverColumns(tableColumns)
          closeSlashMenu()
          closeEmojiMenu()
        },
        () => {
          const wrap = editorWrapRef.current
          const button = wrap?.querySelector<HTMLButtonElement>(
            'button[aria-label="插入 Emoji 短代码"]',
          )
          if (wrap && button) {
            const wrapRect = wrap.getBoundingClientRect()
            const buttonRect = button.getBoundingClientRect()
            setEmojiPickerStyle({
              left: Math.round(buttonRect.left - wrapRect.left),
              top: Math.round(buttonRect.bottom - wrapRect.top + 6),
            })
          }
          setEmojiPickerOpen((value) => !value)
          closeSlashMenu()
          closeEmojiMenu()
        },
      ),
    [tableColumns, tableRows],
  )

  function openTemplatePanel(id: TemplateId) {
    const template = markdownTemplates.find((item) => item.id === id) ?? markdownTemplates[0]!
    setActiveTemplateId(template.id)
    setTemplateDraft(template.content)
    setTemplatePanelOpen(true)
    closeSlashMenu()
  }

  function chooseTemplate(id: TemplateId) {
    const template = markdownTemplates.find((item) => item.id === id) ?? markdownTemplates[0]!
    setActiveTemplateId(template.id)
    setTemplateDraft(template.content)
  }

  function insertTemplateDraft() {
    insertMarkdownAtSelection(
      editorTextareaRef.current,
      templateDraft,
      applyContent,
      contentRef.current,
    )
    setTemplatePanelOpen(false)
  }

  function insertTableFromPanel() {
    const alignments = Array.from(
      { length: tableColumns },
      (_, idx) => tableAlignments[idx] ?? 'left',
    )
    const table = createMarkdownTable({ rows: tableRows, columns: tableColumns, alignments })
    insertMarkdownAtSelection(editorTextareaRef.current, table, applyContent, contentRef.current)
    setTablePanelOpen(false)
  }

  function chooseEmoji(item = emojiSuggestions[emojiIndex]) {
    const textarea = editorTextareaRef.current
    if (!textarea || !emojiState || !item) return
    insertEmoji(textarea, item, emojiState, applyContent)
    closeEmojiMenu()
  }

  function chooseSlashCommand(id = slashCommands[slashIndex]?.id) {
    const textarea = editorTextareaRef.current
    if (!textarea || !slashState || !id) return
    if (id === 'table') {
      setTablePanelOpen(true)
      setTableHoverRows(tableRows)
      setTableHoverColumns(tableColumns)
      closeSlashMenu()
      closeEmojiMenu()
      return
    }
    if (id === 'note-template' || id === 'tutorial-template' || id === 'review-template') {
      const templateId =
        id === 'tutorial-template' ? 'tutorial' : id === 'review-template' ? 'review' : 'note'
      openTemplatePanel(templateId)
      return
    }
    insertSlashCommand(textarea, id, slashState, applyContent)
    closeSlashMenu()
    closeEmojiMenu()
  }

  function insertEmojiFromPicker(item: (typeof emojiPickerItems)[number]) {
    insertAtCaret(editorTextareaRef.current, item.emoji)
    setEmojiPickerOpen(false)
  }

  function handleEditorKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (emojiState) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeEmojiMenu()
        return
      }
      if (emojiSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setEmojiIndex((idx) => (idx + 1) % emojiSuggestions.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setEmojiIndex((idx) => (idx - 1 + emojiSuggestions.length) % emojiSuggestions.length)
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          chooseEmoji()
          return
        }
      }
    }
    if (!slashState) return
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSlashMenu()
      return
    }
    if (slashCommands.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSlashIndex((idx) => (idx + 1) % slashCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSlashIndex((idx) => (idx - 1 + slashCommands.length) % slashCommands.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      chooseSlashCommand()
    }
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
    const alt =
      file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim() || '图片'
    const placeholder = `![uploading…](${file.name})`
    insertAtCaret(textarea, placeholder)
    try {
      const res = await uploadImage(file)
      const finalMd = `![${alt}](${res.url})`
      // Swap placeholder for the real URL (works even if user kept typing).
      setContent((prev) => prev.replace(placeholder, finalMd))
    } catch (err) {
      setContent((prev) => prev.replace(placeholder, ''))
      setFormError((err as Error).message)
    } finally {
      setPasteUploading(false)
    }
  }

  function isStandaloneUrlPaste(textarea: HTMLTextAreaElement, pastedText: string) {
    const current = textarea.value
    const start = textarea.selectionStart ?? current.length
    const end = textarea.selectionEnd ?? current.length
    const lineStart = current.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const nextLine = current.indexOf('\n', end)
    const lineEnd = nextLine === -1 ? current.length : nextLine
    const lineWithoutSelection = `${current.slice(lineStart, start)}${current.slice(end, lineEnd)}`

    return /^https?:\/\/\S+$/.test(pastedText.trim()) && lineWithoutSelection.trim() === ''
  }

  async function insertSmartLink(textarea: HTMLTextAreaElement, url: string) {
    if (!isStandaloneUrlPaste(textarea, url)) {
      insertInlineLinkForUrl(textarea, url, applyContent)
      return
    }

    const placeholderTitle = '正在识别链接'
    const placeholder = `[onebox="${placeholderTitle}"]\n${url}\n[/onebox]`
    insertOneboxForUrl(textarea, url, applyContent, placeholderTitle)

    try {
      const preview = await fetchLinkPreview(url)
      const final = `[onebox="${preview.title.replace(/"/g, '\\"')}"]\n${preview.url}\n[/onebox]`
      replaceTextEverywhere(textarea, placeholder, final, applyContent, contentRef.current)
    } catch {
      const host = new URL(url).hostname.replace(/^www\./, '')
      const final = `[onebox="${host}"]\n${url}\n[/onebox]`
      replaceTextEverywhere(textarea, placeholder, final, applyContent, contentRef.current)
    }
  }

  function htmlToMarkdown(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
      if (node.nodeType !== Node.ELEMENT_NODE) return ''
      const el = node as HTMLElement
      const children = Array.from(el.childNodes).map(walk).join('')
      const tag = el.tagName.toLowerCase()
      if (tag === 'strong' || tag === 'b') return `**${children}**`
      if (tag === 'em' || tag === 'i') return `*${children}*`
      if (tag === 'code') return `\`${children}\``
      if (tag === 'a') {
        const href = el.getAttribute('href')
        return href ? `[${children || href}](${href})` : children
      }
      if (tag === 'br') return '\n'
      if (tag === 'li') return `- ${children.trim()}\n`
      if (/h[1-6]/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${children.trim()}\n\n`
      if (tag === 'blockquote')
        return `${children
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')}\n\n`
      if (tag === 'p' || tag === 'div') return `${children.trim()}\n\n`
      if (tag === 'ul' || tag === 'ol') return `${children.trim()}\n\n`
      if (tag === 'mark' || tag === 'kbd' || tag === 'sub' || tag === 'sup')
        return `<${tag}>${children}</${tag}>`
      return children
    }
    return Array.from(doc.body.childNodes)
      .map(walk)
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function handleEditorPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (files.length === 0) {
      const html = e.clipboardData?.getData('text/html')
      if (html) {
        const markdown = htmlToMarkdown(html)
        if (markdown) {
          e.preventDefault()
          const ta = e.currentTarget
          editorTextareaRef.current = ta
          insertAtCaret(ta, markdown)
          closeSlashMenu()
          closeEmojiMenu()
          return
        }
      }
      const text = e.clipboardData?.getData('text/plain')?.trim()
      if (text && /^https?:\/\/\S+$/.test(text)) {
        e.preventDefault()
        const ta = e.currentTarget
        editorTextareaRef.current = ta
        void insertSmartLink(ta, text)
        closeSlashMenu()
        closeEmojiMenu()
      }
      return
    }
    e.preventDefault()
    const ta = e.currentTarget
    editorTextareaRef.current = ta
    closeSlashMenu()
    closeEmojiMenu()
    for (const f of files) void handleImageUpload(f, ta)
  }

  function handleEditorDrop(e: DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    e.preventDefault()
    const ta = e.currentTarget
    editorTextareaRef.current = ta
    closeSlashMenu()
    for (const f of files) void handleImageUpload(f, ta)
  }

  const wordCount = content.length
  const readTime = estimateReadTime(content)
  const status = articleQuery.data?.status ?? 'DRAFT'
  const isSaving = saveMutation.isPending || publishMutation.isPending
  const saveLabel = publishMutation.isPending
    ? '发布中…'
    : saveState === 'saving' || saveMutation.isPending
      ? '保存中…'
      : saveState === 'dirty'
        ? '有未保存修改'
        : saveState === 'error'
          ? '保存失败'
          : lastSavedAt
            ? `已保存 · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : status === 'PUBLISHED'
              ? '已发布'
              : '草稿'
  const saveDotClass =
    saveState === 'dirty'
      ? 'bg-amber-500'
      : saveState === 'error'
        ? 'bg-red-500'
        : saveState === 'saving' || saveMutation.isPending || publishMutation.isPending
          ? 'bg-klein'
          : 'bg-emerald-signal'

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
  if (
    isEdit &&
    articleQuery.data &&
    user &&
    articleQuery.data.authorId !== user.id &&
    user.role !== 'ADMIN'
  ) {
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
          <CoverDropzone value={coverUrl} onChange={setCoverUrl} />
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
          <div className="relative">
            <div
              ref={editorWrapRef}
              data-color-mode={theme}
              className="md-editor-shell resize-y overflow-hidden"
              style={{ height: 720, minHeight: 320, maxHeight: '85vh' }}
            >
              <MDEditor
                value={content}
                onChange={(v) => applyContent(v ?? '')}
                commands={markdownCommands}
                extraCommands={markdownEditorExtraCommands}
                components={markdownEditorComponents}
                height={editorHeight}
                preview={showPreview ? 'live' : 'edit'}
                visibleDragbar={false}
                textareaProps={{
                  onClick: (e) => refreshSlashMenu(e.currentTarget),
                  onKeyDown: handleEditorKeyDown,
                  onKeyUp: (e) => refreshSlashMenu(e.currentTarget),
                  onPaste: handleEditorPaste,
                  onDrop: handleEditorDrop,
                  onSelect: (e) => refreshSlashMenu(e.currentTarget),
                  placeholder: '在这里写正文… 粘贴或拖入图片会自动上传',
                }}
              />
            </div>
            {slashState && (
              <MarkdownSlashMenu
                commands={slashCommands}
                activeIndex={slashIndex}
                onChoose={chooseSlashCommand}
              />
            )}
            {emojiState && (
              <EmojiSuggestMenu
                items={emojiSuggestions}
                activeIndex={emojiIndex}
                onChoose={chooseEmoji}
              />
            )}
            {emojiPickerOpen && !emojiState && (
              <EmojiSuggestMenu
                items={emojiPickerItems}
                activeIndex={-1}
                onChoose={insertEmojiFromPicker}
                variant="picker"
                style={emojiPickerStyle}
              />
            )}
          </div>

          <p className="mt-2 font-mono text-xs text-steel">
            提示 · 粘贴 / 拖入图片自动上传 · 右下角拖拽调整高度
            {pasteUploading && <span className="ml-2 text-klein">· 图片上传中…</span>}
          </p>
        </div>

        {formError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
      </main>

      {templatePanelOpen && (
        <div className="template-dialog-backdrop" role="presentation">
          <div className="template-dialog" role="dialog" aria-modal="true" aria-label="模板预览">
            <div className="template-dialog-head">
              <div>
                <p className="template-dialog-kicker">TEMPLATES</p>
                <h2>选择并调整模板</h2>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setTemplatePanelOpen(false)}
                aria-label="关闭模板面板"
              >
                ×
              </button>
            </div>

            <div className="template-dialog-grid">
              <div className="template-dialog-list">
                {markdownTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={template.id === activeTemplateId ? 'is-active' : ''}
                    onClick={() => chooseTemplate(template.id)}
                  >
                    <span>{template.label}</span>
                    <small>{template.description}</small>
                  </button>
                ))}
              </div>

              <div className="template-dialog-editor">
                <label className="field-label">EDIT BEFORE INSERT</label>
                <textarea
                  value={templateDraft}
                  onChange={(e) => setTemplateDraft(e.target.value)}
                  className="input template-dialog-textarea"
                />
              </div>

              <div className="template-dialog-preview">
                <p className="field-label">PREVIEW</p>
                <div className="template-dialog-preview-body">
                  <MarkdownRenderer>{templateDraft}</MarkdownRenderer>
                </div>
              </div>
            </div>

            <div className="template-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTemplatePanelOpen(false)}
              >
                取消
              </button>
              <button type="button" className="btn-primary" onClick={insertTemplateDraft}>
                插入模板
              </button>
            </div>
          </div>
        </div>
      )}

      {tablePanelOpen && (
        <div className="table-dialog-backdrop" role="presentation">
          <div className="table-dialog" role="dialog" aria-modal="true" aria-label="表格插入器">
            <div className="table-dialog-head">
              <div>
                <p className="template-dialog-kicker">TABLE</p>
                <h2>插入 Markdown 表格</h2>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setTablePanelOpen(false)}
                aria-label="关闭表格插入器"
              >
                ×
              </button>
            </div>

            <div className="table-dialog-body">
              <div className="table-size-picker">
                {Array.from({ length: 6 }, (_, row) =>
                  Array.from({ length: 8 }, (_, col) => {
                    const active = row < tableHoverRows && col < tableHoverColumns
                    const selected = row < tableRows && col < tableColumns
                    return (
                      <button
                        key={`${row}-${col}`}
                        type="button"
                        className={`${active ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`}
                        onMouseEnter={() => {
                          setTableHoverRows(row + 1)
                          setTableHoverColumns(col + 1)
                        }}
                        onClick={() => {
                          setTableRows(row + 1)
                          setTableColumns(col + 1)
                          setTableHoverRows(row + 1)
                          setTableHoverColumns(col + 1)
                        }}
                        aria-label={`${row + 1} 行 ${col + 1} 列`}
                      />
                    )
                  }),
                )}
              </div>

              <div className="table-dialog-side">
                <p className="font-mono text-xs text-steel">
                  预览 {tableHoverRows} 行 × {tableHoverColumns} 列 · 已选 {tableRows} 行 ×{' '}
                  {tableColumns} 列
                </p>
                <div className="table-align-grid">
                  {Array.from({ length: tableColumns }, (_, idx) => (
                    <label key={idx}>
                      <span>列 {idx + 1}</span>
                      <select
                        value={tableAlignments[idx] ?? 'left'}
                        onChange={(e) => {
                          const next = [...tableAlignments]
                          next[idx] = e.target.value as TableAlignment
                          setTableAlignments(next)
                        }}
                      >
                        <option value="left">左对齐</option>
                        <option value="center">居中</option>
                        <option value="right">右对齐</option>
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <pre className="table-dialog-preview">
              {createMarkdownTable({
                rows: tableRows,
                columns: tableColumns,
                alignments: tableAlignments,
              })}
            </pre>

            <div className="template-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setTableRows((value) => Math.min(20, value + 1))
                }}
              >
                添加行
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setTableColumns((value) => Math.min(10, value + 1))
                }}
              >
                添加列
              </button>
              <button type="button" className="btn-primary" onClick={insertTableFromPanel}>
                插入表格
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-30 backdrop-blur-md bg-surface/85 border-t border-whisper">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-steel font-mono text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${saveDotClass}`} />
              {saveLabel}
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
