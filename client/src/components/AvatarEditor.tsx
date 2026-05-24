import { useRef, useState, type DragEvent } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { uploadImage, UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from '@/api/upload'
import { cn } from '@/utils/cn'

interface Props {
  value: string | null
  onChange: (v: string | null) => void
  /** Used for the initial letter when there's no avatar */
  fallback: string
  /** Smaller circular preview — useful inside modals */
  size?: 'sm' | 'md'
}

/**
 * Click / drag / drop to upload, hover overlay, remove button.
 * Used on both the Me page and the admin user-edit modal.
 */
export function AvatarEditor({ value, onChange, fallback, size = 'md' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const res = await uploadImage(file)
      onChange(res.url)
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

  const previewBox = size === 'sm' ? 'w-16 h-16 text-xl' : 'w-24 h-24 text-2xl'

  return (
    <div className="flex items-center gap-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (busy) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          if (busy) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'group relative rounded-full overflow-hidden border-2 border-dashed transition-colors flex items-center justify-center bg-whisper-soft',
          previewBox,
          busy ? 'cursor-wait opacity-70' : 'cursor-pointer',
          dragOver
            ? 'border-klein bg-klein/[0.04]'
            : 'border-whisper hover:border-klein',
        )}
        title="点击或拖入图片更换头像"
      >
        {value ? (
          <img
            src={value}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
          />
        ) : (
          <span className="font-semibold text-steel">
            {fallback[0]?.toUpperCase() ?? '?'}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </span>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !busy && inputRef.current?.click()}
            disabled={busy}
            className="btn-secondary !py-1.5 !px-3 text-xs"
          >
            <Camera size={12} />
            {value ? '更换' : '上传头像'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs text-steel hover:text-red-600 px-2 py-1.5 rounded transition-colors"
            >
              <Trash2 size={12} />
              移除
            </button>
          )}
        </div>
        <p className="font-mono text-xs text-steel">
          PNG · JPG · WEBP · GIF · ≤ {UPLOAD_MAX_BYTES / 1024 / 1024}MB
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </div>
  )
}
