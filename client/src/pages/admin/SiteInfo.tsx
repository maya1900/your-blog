import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import {
  getSiteSettings,
  updateSiteSettings,
  type SiteSettings,
} from '@/api/site'
import { uploadImage, UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from '@/api/upload'
import { cn } from '@/utils/cn'

const TITLE_MAX = 32
const TAGLINE_MAX = 200

export function AdminSiteInfoPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['site', 'settings'],
    queryFn: getSiteSettings,
  })

  const [draft, setDraft] = useState<SiteSettings | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Hydrate the form once the server value is in
  useEffect(() => {
    if (data && !draft) setDraft(data)
  }, [data, draft])

  const saveMu = useMutation({
    mutationFn: () => {
      if (!draft || !data) throw new Error('未加载')
      const input: Partial<SiteSettings> = {}
      if (draft.siteTitle.trim() !== data.siteTitle)
        input.siteTitle = draft.siteTitle.trim()
      if (draft.siteTagline !== data.siteTagline)
        input.siteTagline = draft.siteTagline
      if (draft.siteLogo !== data.siteLogo) input.siteLogo = draft.siteLogo
      if (draft.siteFavicon !== data.siteFavicon)
        input.siteFavicon = draft.siteFavicon
      return updateSiteSettings(input)
    },
    onSuccess: (updated) => {
      qc.setQueryData(['site', 'settings'], updated)
      setDraft(updated)
      setSavedAt(Date.now())
    },
  })

  const errorMsg = saveMu.isError ? (saveMu.error as Error).message : null

  const dirty =
    !!data &&
    !!draft &&
    (draft.siteTitle.trim() !== data.siteTitle ||
      draft.siteTagline !== data.siteTagline ||
      draft.siteLogo !== data.siteLogo ||
      draft.siteFavicon !== data.siteFavicon)

  const titleInvalid = !!draft && draft.siteTitle.trim().length === 0

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">站点信息</h2>
          <p className="mt-1 text-steel">
            站点名 / 标语 / Logo / Favicon 会即时反映到访客视图。改完立即生效。
          </p>
        </div>
      </div>

      <div className="bg-white border border-whisper rounded-xl p-6 max-w-2xl">
        {isLoading || !draft ? (
          <p className="text-steel font-mono text-sm py-10 text-center">加载中…</p>
        ) : (
          <>
            <div className="mb-5">
              <label className="field-label" htmlFor="s-title">
                站点名 (siteTitle)
              </label>
              <input
                id="s-title"
                type="text"
                value={draft.siteTitle}
                onChange={(e) =>
                  setDraft({ ...draft, siteTitle: e.target.value.slice(0, TITLE_MAX) })
                }
                maxLength={TITLE_MAX}
                placeholder="墨记"
                className="input"
              />
              <p
                className={cn(
                  'mt-1 font-mono text-xs text-right',
                  draft.siteTitle.length > TITLE_MAX - 4
                    ? 'text-amber-600'
                    : 'text-steel',
                )}
              >
                {draft.siteTitle.length} / {TITLE_MAX}
              </p>
            </div>

            <div className="mb-5">
              <label className="field-label" htmlFor="s-tagline">
                标语 (siteTagline) · 显示在 footer
              </label>
              <textarea
                id="s-tagline"
                value={draft.siteTagline}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteTagline: e.target.value.slice(0, TAGLINE_MAX),
                  })
                }
                maxLength={TAGLINE_MAX}
                rows={3}
                placeholder="一句话介绍这个站点"
                className="input resize-none"
              />
              <p
                className={cn(
                  'mt-1 font-mono text-xs text-right',
                  draft.siteTagline.length > TAGLINE_MAX - 20
                    ? 'text-amber-600'
                    : 'text-steel',
                )}
              >
                {draft.siteTagline.length} / {TAGLINE_MAX}
              </p>
            </div>

            <ImageField
              label="Logo · 替换顶部和后台的站点名"
              hint="建议横向 / 透明背景 / PNG。留空则显示站点名文字。"
              shape="rect"
              value={draft.siteLogo}
              onChange={(v) => setDraft({ ...draft, siteLogo: v })}
            />

            <ImageField
              label="Favicon · 浏览器标签图标"
              hint="建议正方形,32×32 或 64×64 的 PNG / ICO。留空使用默认。"
              shape="square"
              value={draft.siteFavicon}
              onChange={(v) => setDraft({ ...draft, siteFavicon: v })}
            />

            <div className="flex items-center gap-3 pt-5 border-t border-whisper mt-6">
              <button
                type="button"
                onClick={() => {
                  saveMu.reset()
                  setSavedAt(null)
                  saveMu.mutate()
                }}
                disabled={!dirty || titleInvalid || saveMu.isPending}
                className="btn-primary !py-2 !px-5 text-sm"
              >
                {saveMu.isPending ? '保存中…' : '保存修改'}
              </button>

              {dirty && !saveMu.isPending && data && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(data)
                    setSavedAt(null)
                    saveMu.reset()
                  }}
                  className="btn-secondary"
                >
                  撤销
                </button>
              )}

              {titleInvalid && (
                <p className="text-sm text-amber-600 ml-auto">站点名不能为空</p>
              )}
              {!titleInvalid && errorMsg && (
                <p className="text-sm text-red-600 ml-auto">{errorMsg}</p>
              )}
              {!errorMsg && !titleInvalid && savedAt && !dirty && (
                <p className="text-sm text-emerald-700 ml-auto">已保存 ✓</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============ Image field (logo / favicon) ============

interface ImageFieldProps {
  label: string
  hint: string
  /** rect for logos (wide preview), square for favicon */
  shape: 'rect' | 'square'
  value: string
  onChange: (v: string) => void
}

function ImageField({ label, hint, shape, value, onChange }: ImageFieldProps) {
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

  const previewClass =
    shape === 'square' ? 'w-16 h-16 rounded-md' : 'w-32 h-16 rounded-md'

  return (
    <div className="mb-5">
      <p className="field-label mb-2">{label}</p>
      <div className="flex items-center gap-4 flex-wrap">
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
            'group relative overflow-hidden border-2 border-dashed transition-colors flex items-center justify-center bg-whisper-soft',
            previewClass,
            busy ? 'cursor-wait opacity-70' : 'cursor-pointer',
            dragOver
              ? 'border-klein bg-klein/[0.04]'
              : 'border-whisper hover:border-klein',
          )}
          title="点击或拖入图片"
        >
          {value ? (
            <img
              src={value}
              alt=""
              className="w-full h-full object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')}
            />
          ) : (
            <span className="font-mono text-[11px] text-steel">无</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          </span>
        </div>

        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="留空 = 不设;或粘贴 https://… / /uploads/…"
            className="admin-input font-mono text-[13px] w-full"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => !busy && inputRef.current?.click()}
              disabled={busy}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              <Camera size={12} />
              {value ? '更换' : '上传'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1 text-xs text-steel hover:text-red-600 px-2 py-1.5 rounded transition-colors"
              >
                <Trash2 size={12} />
                移除
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 font-mono text-xs text-steel">
        {hint} · ≤ {UPLOAD_MAX_BYTES / 1024 / 1024}MB
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

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
