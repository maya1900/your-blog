import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Dices,
  ImagePlus,
  Link2,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  searchUnsplashPhotos,
  type UnsplashPhoto,
  type UnsplashSearchResult,
} from '@/api/unsplash'
import {
  UPLOAD_ACCEPT,
  UPLOAD_MAX_BYTES,
  deleteCoverFile,
  deleteCoverFileKeepalive,
  uploadCover,
  uploadRandomCover,
  uploadUnsplashCover,
  type CoverSource,
} from '@/api/upload'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  value: string
  onChange: (url: string) => void
  /** Optional — used as the Unsplash search keyword on the first random pick. */
  randomQuery?: string
}

type Mode = 'upload' | 'url' | 'unsplash'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    return u.pathname.split('/').pop() ?? url
  } catch {
    return url.split('/').pop() ?? url
  }
}

/** Accept full URLs or root-relative paths like /uploads/... */
function isPlausibleImageUrl(s: string): boolean {
  const v = s.trim()
  if (!v) return false
  if (v.startsWith('/')) return true
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function errMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
  return e?.response?.data?.error?.message ?? e?.message ?? '操作失败'
}

export function CoverDropzone({ value, onChange, randomQuery }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const unsplashInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<false | 'upload' | CoverSource>(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [meta, setMeta] = useState<{ name: string; size: number } | null>(null)
  const [mode, setMode] = useState<Mode>('upload')
  const [urlDraft, setUrlDraft] = useState('')
  const [lastRandomSource, setLastRandomSource] = useState<CoverSource | null>(null)
  const [unsplashQuery, setUnsplashQuery] = useState(randomQuery ?? '')
  const [unsplashPage, setUnsplashPage] = useState(1)
  const [unsplashResult, setUnsplashResult] = useState<UnsplashSearchResult | null>(null)
  const [unsplashLoading, setUnsplashLoading] = useState(false)

  // URLs that THIS dropzone instance wrote to /uploads/ this session. On
  // unmount / pagehide we try to delete each one — the server's reference
  // guard preserves files actually saved on an article.
  const createdUrlsRef = useRef<Set<string>>(new Set())

  function trackCreated(url: string) {
    if (url.startsWith('/uploads/')) createdUrlsRef.current.add(url)
  }
  function forgetCreated(url: string) {
    createdUrlsRef.current.delete(url)
  }

  async function handleFile(file: File) {
    const stale = staleRandomUrl()
    setError(null)
    setBusy('upload')
    try {
      const res = await uploadCover(file)
      onChange(res.url)
      setMeta({ name: res.filename, size: res.size })
      setLastRandomSource(null)
      trackCreated(res.url)
      if (stale) {
        void deleteCoverFile(stale)
        forgetCreated(stale)
      }
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRandom(source: CoverSource) {
    const stale = staleRandomUrl()
    setError(null)
    setBusy(source)
    try {
      const query = source === 'unsplash' ? unsplashQuery.trim() || randomQuery : undefined
      const res = await uploadRandomCover(source, query)
      onChange(res.url)
      setMeta({ name: res.filename, size: res.size })
      setLastRandomSource(source)
      // Bail out of url-entry mode if user was there.
      setMode('upload')
      trackCreated(res.url)
      if (stale && stale !== res.url) {
        void deleteCoverFile(stale)
        forgetCreated(stale)
      }
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleUnsplashSearch(page = 1) {
    const query = unsplashQuery.trim() || randomQuery?.trim()
    if (!query) {
      setError('请输入 Unsplash 搜索词')
      return
    }
    setError(null)
    setUnsplashLoading(true)
    try {
      const result = await searchUnsplashPhotos(query, page)
      setUnsplashResult(result)
      setUnsplashPage(page)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setUnsplashLoading(false)
    }
  }

  async function handleUnsplashPick(photo: UnsplashPhoto) {
    const stale = staleRandomUrl()
    setError(null)
    setBusy('unsplash')
    try {
      const res = await uploadUnsplashCover(photo.urls.regular, photo.links.downloadLocation)
      onChange(res.url)
      setMeta({ name: res.filename, size: res.size })
      setLastRandomSource('unsplash')
      setMode('upload')
      trackCreated(res.url)
      if (stale && stale !== res.url) {
        void deleteCoverFile(stale)
        forgetCreated(stale)
      }
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  /** A previous random pick that's about to be replaced — eligible for cleanup. */
  function staleRandomUrl(): string | null {
    if (!lastRandomSource) return null
    if (!value.startsWith('/uploads/')) return null
    return value
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function reset() {
    // Always try to delete on remove — server's reference guard refuses if the
    // file is still pinned to an article. Covers both "I uploaded then changed
    // my mind" and "I removed a random pick".
    if (value.startsWith('/uploads/')) {
      void deleteCoverFile(value)
      forgetCreated(value)
    }
    onChange('')
    setMeta(null)
    setError(null)
    setUrlDraft('')
    setMode('upload')
    setLastRandomSource(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Page-leave cleanup. Two paths:
  //  - SPA navigation / parent unmount → useEffect cleanup runs, axios delete is fine.
  //  - Tab close / refresh → `pagehide` fires; use fetch(keepalive) since async
  //    cleanup of the React tree can't outlive the navigation.
  // Server reference guard means firing for everything in the set is safe even
  // if the user actually saved the article.
  useEffect(() => {
    const onPageHide = () => {
      const token = useAuthStore.getState().token
      for (const url of createdUrlsRef.current) {
        deleteCoverFileKeepalive(url, token)
      }
      createdUrlsRef.current.clear()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      for (const url of createdUrlsRef.current) {
        void deleteCoverFile(url)
      }
      createdUrlsRef.current.clear()
    }
  }, [])

  function openUrlMode() {
    setError(null)
    setUrlDraft('')
    setMode('url')
    requestAnimationFrame(() => urlInputRef.current?.focus())
  }

  function openUnsplashMode() {
    setError(null)
    setUnsplashQuery((v) => v || randomQuery || '')
    setMode('unsplash')
    requestAnimationFrame(() => unsplashInputRef.current?.focus())
  }

  function confirmUrl() {
    const v = urlDraft.trim()
    if (!isPlausibleImageUrl(v)) {
      setError('请填入 http(s):// 开头的图片链接')
      return
    }
    const stale = staleRandomUrl()
    setError(null)
    setMeta(null) // External link — we have no size, just show the filename hint.
    setLastRandomSource(null)
    onChange(v)
    setMode('upload')
    if (stale) void deleteCoverFile(stale)
  }

  function onUrlKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmUrl()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMode('upload')
      setError(null)
    }
  }

  function onUnsplashKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleUnsplashSearch(1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMode('upload')
      setError(null)
    }
  }

  const filled = !!value
  const isBusy = busy !== false

  const busyLabel =
    busy === 'picsum' ? '随机抓取中…' : busy === 'unsplash' ? '从 Unsplash 抓取中…' : '上传中…'

  // URL-entry mode — same outer shell, swapped content. Not a dropzone in this state.
  if (mode === 'url' && !filled) {
    return (
      <div>
        <div className="flex items-center gap-3 p-3.5 border border-dashed border-klein rounded-[10px] bg-klein/[0.04]">
          <div className="w-24 h-16 rounded-md overflow-hidden border border-whisper bg-whisper-soft flex-shrink-0 flex items-center justify-center">
            <Link2 size={20} className="text-klein" />
          </div>
          <input
            ref={urlInputRef}
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={onUrlKeyDown}
            placeholder="粘贴图片链接 · https://… 或 /uploads/…"
            className="flex-1 min-w-0 bg-surface border border-whisper rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-klein focus:ring-[3px] focus:ring-klein/20"
          />
          <button
            type="button"
            onClick={confirmUrl}
            className="btn-icon !text-klein hover:!bg-klein/10 flex-shrink-0"
            aria-label="确定"
            title="确定 (Enter)"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('upload')
              setError(null)
            }}
            className="btn-icon flex-shrink-0"
            aria-label="取消"
            title="取消 (Esc)"
          >
            <X size={16} />
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (mode === 'unsplash' && !filled) {
    const hasPrev = unsplashPage > 1
    const hasNext = !!unsplashResult && unsplashPage < unsplashResult.totalPages

    return (
      <div>
        <div className="rounded-[10px] border border-whisper bg-surface p-3.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"
              />
              <input
                ref={unsplashInputRef}
                type="search"
                value={unsplashQuery}
                onChange={(e) => setUnsplashQuery(e.target.value)}
                onKeyDown={onUnsplashKeyDown}
                placeholder="搜索 Unsplash 封面"
                className="w-full bg-surface border border-whisper rounded-lg pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-klein focus:ring-[3px] focus:ring-klein/20"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleUnsplashSearch(1)}
              className="btn-icon !text-klein hover:!bg-klein/10 flex-shrink-0"
              aria-label="搜索 Unsplash"
              title="搜索"
              disabled={unsplashLoading}
            >
              {unsplashLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleRandom('unsplash')}
              className="btn-icon hover:!bg-klein/10 hover:!text-klein flex-shrink-0"
              aria-label="随机 Unsplash"
              title="随机"
              disabled={isBusy}
            >
              <Dices size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload')
                setError(null)
              }}
              className="btn-icon flex-shrink-0"
              aria-label="关闭 Unsplash"
              title="关闭"
            >
              <X size={16} />
            </button>
          </div>

          {unsplashResult && (
            <>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {unsplashResult.results.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => void handleUnsplashPick(photo)}
                    className="group relative aspect-[4/3] overflow-hidden rounded-md border border-whisper bg-whisper-soft text-left focus:outline-none focus:ring-[3px] focus:ring-klein/25 disabled:opacity-70"
                    disabled={isBusy}
                    title={`选择 ${photo.photographer.name} 的图片`}
                  >
                    <img
                      src={photo.urls.small}
                      alt={photo.alt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] leading-tight text-white truncate">
                      {photo.photographer.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-steel">
                  {unsplashResult.total.toLocaleString()} 张 · 第 {unsplashPage} /{' '}
                  {Math.max(unsplashResult.totalPages, 1)} 页
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleUnsplashSearch(unsplashPage - 1)}
                    disabled={!hasPrev || unsplashLoading}
                    className="btn-icon !w-8 !h-8 disabled:opacity-30"
                    aria-label="上一页"
                    title="上一页"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUnsplashSearch(unsplashPage + 1)}
                    disabled={!hasNext || unsplashLoading}
                    className="btn-icon !w-8 !h-8 disabled:opacity-30"
                    aria-label="下一页"
                    title="下一页"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}

          {!unsplashResult && !unsplashLoading && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-whisper bg-whisper-soft px-3 py-3 text-sm text-steel">
              <ImagePlus size={16} />
              搜索后选择一张图作为封面
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isBusy && !filled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (filled || isBusy) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          if (filled || isBusy) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'flex items-center gap-3.5 p-3.5 border border-dashed rounded-[10px] bg-surface transition-colors',
          filled || isBusy ? 'cursor-default' : 'cursor-pointer',
          dragOver
            ? 'border-klein bg-klein/[0.04]'
            : filled
              ? 'border-whisper'
              : 'border-whisper hover:border-klein hover:bg-klein/[0.04]',
          isBusy ? 'opacity-70 cursor-wait' : '',
        ].join(' ')}
      >
        <div className="w-24 h-16 rounded-md overflow-hidden border border-whisper bg-whisper-soft flex-shrink-0 flex items-center justify-center">
          {filled ? (
            <img
              src={value}
              alt="封面预览"
              className="w-full h-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
            />
          ) : (
            <ImagePlus size={20} className="text-steel" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isBusy ? (
            <p className="text-sm text-ink font-medium inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {busyLabel}
            </p>
          ) : filled ? (
            <>
              <p className="text-sm text-ink font-medium truncate">
                {meta?.name ?? fileNameFromUrl(value)}
              </p>
              <p className="font-mono text-xs text-steel mt-0.5 truncate">
                {meta
                  ? `${formatSize(meta.size)}${lastRandomSource ? ` · ${lastRandomSource === 'picsum' ? 'Picsum' : 'Unsplash'}` : ''}`
                  : value.startsWith('/uploads/')
                    ? '已上传'
                    : '外部链接'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink font-medium">点击选择 或 拖拽图片到此</p>
              <p className="font-mono text-xs text-steel mt-0.5">
                PNG · JPG · WEBP · GIF · ≤ {UPLOAD_MAX_BYTES / 1024 / 1024}MB · 自动转 JPG 16:9
              </p>
            </>
          )}
        </div>

        {!filled && !isBusy && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void handleRandom('picsum')
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-steel hover:text-klein hover:bg-klein/[0.06] transition-colors font-medium"
              title="随机抓一张 Picsum 图"
            >
              <Dices size={13} />
              Picsum
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openUnsplashMode()
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-steel hover:text-klein hover:bg-klein/[0.06] transition-colors font-medium"
              title="搜索 Unsplash 图片"
            >
              <Search size={13} />
              Unsplash
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openUrlMode()
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-steel hover:text-klein hover:bg-klein/[0.06] transition-colors font-medium"
              title="改用图片链接"
            >
              <Link2 size={13} />
              链接
            </button>
          </div>
        )}

        {filled && !isBusy && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {lastRandomSource && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleRandom(lastRandomSource)
                }}
                className="btn-icon hover:!bg-klein/10 hover:!text-klein"
                aria-label={`重抽 ${lastRandomSource === 'picsum' ? 'Picsum' : 'Unsplash'}`}
                title={`重抽 ${lastRandomSource === 'picsum' ? 'Picsum' : 'Unsplash'}`}
              >
                <Dices size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                reset()
              }}
              className="btn-icon hover:!bg-red-50 hover:!text-red-600"
              aria-label="移除封面"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
