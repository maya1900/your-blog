import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Check, ImagePlus, Link2, Loader2, Trash2, X } from 'lucide-react'
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES, uploadImage } from '@/api/upload'

interface Props {
  value: string
  onChange: (url: string) => void
}

type Mode = 'upload' | 'url'

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

export function CoverDropzone({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [meta, setMeta] = useState<{ name: string; size: number } | null>(null)
  const [mode, setMode] = useState<Mode>('upload')
  const [urlDraft, setUrlDraft] = useState('')

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const res = await uploadImage(file)
      onChange(res.url)
      setMeta({ name: res.filename, size: res.size })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function reset() {
    onChange('')
    setMeta(null)
    setError(null)
    setUrlDraft('')
    setMode('upload')
    if (inputRef.current) inputRef.current.value = ''
  }

  function openUrlMode() {
    setError(null)
    setUrlDraft('')
    setMode('url')
    // Focus the input after it mounts.
    requestAnimationFrame(() => urlInputRef.current?.focus())
  }

  function confirmUrl() {
    const v = urlDraft.trim()
    if (!isPlausibleImageUrl(v)) {
      setError('请填入 http(s):// 开头的图片链接')
      return
    }
    setError(null)
    setMeta(null) // External link — we have no size, just show the filename hint.
    onChange(v)
    setMode('upload')
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

  const filled = !!value

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
            className="flex-1 min-w-0 bg-white border border-whisper rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-klein focus:ring-[3px] focus:ring-klein/20"
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

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && !filled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (filled || busy) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          if (filled || busy) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'flex items-center gap-3.5 p-3.5 border border-dashed rounded-[10px] bg-white transition-colors',
          filled || busy ? 'cursor-default' : 'cursor-pointer',
          dragOver
            ? 'border-klein bg-klein/[0.04]'
            : filled
              ? 'border-whisper'
              : 'border-whisper hover:border-klein hover:bg-klein/[0.04]',
          busy ? 'opacity-70 cursor-wait' : '',
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
          {busy ? (
            <p className="text-sm text-ink font-medium inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              上传中…
            </p>
          ) : filled ? (
            <>
              <p className="text-sm text-ink font-medium truncate">
                {meta?.name ?? fileNameFromUrl(value)}
              </p>
              <p className="font-mono text-xs text-steel mt-0.5 truncate">
                {meta ? formatSize(meta.size) : value.startsWith('/uploads/') ? '已上传' : '外部链接'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink font-medium">点击选择 或 拖拽图片到此</p>
              <p className="font-mono text-xs text-steel mt-0.5">
                PNG · JPG · WEBP · GIF · ≤ {UPLOAD_MAX_BYTES / 1024 / 1024}MB
              </p>
            </>
          )}
        </div>

        {!filled && !busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openUrlMode()
            }}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-steel hover:text-klein hover:bg-klein/[0.06] transition-colors font-medium"
            title="改用图片链接"
          >
            <Link2 size={13} />
            粘贴链接
          </button>
        )}

        {filled && !busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              reset()
            }}
            className="btn-icon hover:!bg-red-50 hover:!text-red-600 flex-shrink-0"
            aria-label="移除封面"
          >
            <Trash2 size={15} />
          </button>
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
