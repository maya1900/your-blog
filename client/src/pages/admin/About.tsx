import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MDEditor from '@uiw/react-md-editor'
import { Eye } from 'lucide-react'
import { Link } from '@/components/Link'
import { getAbout, updateAbout } from '@/api/site'
import { formatDate } from '@/utils/format'
import { useTheme } from '@/hooks/useTheme'

export function AdminAboutPage() {
  const qc = useQueryClient()
  const { theme } = useTheme()
  const { data, isLoading } = useQuery({
    queryKey: ['site', 'about'],
    queryFn: getAbout,
  })

  const [draft, setDraft] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Hydrate the editor once the server value is in
  useEffect(() => {
    if (data && draft === '') setDraft(data.content)
  }, [data, draft])

  const saveMu = useMutation({
    mutationFn: () => updateAbout(draft),
    onSuccess: (updated) => {
      qc.setQueryData(['site', 'about'], updated)
      setSavedAt(Date.now())
    },
  })

  const dirty = data ? draft !== data.content : false
  const errorMsg = saveMu.isError ? (saveMu.error as Error).message : null

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">关于页</h2>
          <p className="mt-1 text-steel">
            站点 <span className="font-mono">/about</span> 页面的内容。支持 Markdown,会即时反映到访客视图。
          </p>
        </div>
        <Link
          to="/about"
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
        >
          <Eye size={14} />
          预览访客视图
        </Link>
      </div>

      <div className="bg-surface border border-whisper rounded-xl p-5">
        {isLoading ? (
          <p className="text-steel font-mono text-sm py-10 text-center">加载中…</p>
        ) : (
          <div data-color-mode={theme} className="md-editor-shell">
            <MDEditor
              value={draft}
              onChange={(v) => setDraft(v ?? '')}
              height={520}
              preview="live"
              visibleDragbar={false}
              textareaProps={{
                placeholder: '用 Markdown 写关于页内容…',
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            saveMu.reset()
            setSavedAt(null)
            saveMu.mutate()
          }}
          disabled={!dirty || saveMu.isPending}
          className="btn-primary !py-2 !px-5 text-sm"
        >
          {saveMu.isPending ? '保存中…' : '保存修改'}
        </button>

        {dirty && !saveMu.isPending && data && (
          <button
            type="button"
            onClick={() => {
              setDraft(data.content)
              setSavedAt(null)
              saveMu.reset()
            }}
            className="btn-secondary"
          >
            撤销
          </button>
        )}

        {data?.updatedAt && (
          <p className="ml-auto font-mono text-[13px] text-steel">
            最后更新 · {formatDate(data.updatedAt)}
          </p>
        )}

        {errorMsg && (
          <p className="text-sm text-red-600 ml-auto">{errorMsg}</p>
        )}
        {!errorMsg && savedAt && !dirty && (
          <p className="text-sm text-emerald-700 ml-auto">已保存 ✓</p>
        )}
      </div>
    </div>
  )
}
