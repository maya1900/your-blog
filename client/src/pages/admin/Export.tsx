import { useMutation } from '@tanstack/react-query'
import { Download, FileJson, ShieldCheck } from 'lucide-react'
import { downloadSiteExport } from '@/api/admin'

export function AdminExportPage() {
  const exportMutation = useMutation({
    mutationFn: downloadSiteExport,
  })

  return (
    <div className="max-w-[880px] space-y-6">
      <div>
        <p className="font-mono text-xs text-steel tracking-[0.08em] inline-flex items-center gap-2 mb-3">
          <FileJson size={13} />
          EXPORT
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">整站导出</h2>
        <p className="mt-2 text-steel">下载结构化 JSON 备份,用于归档、迁移或二次处理。</p>
      </div>

      <section className="bg-surface border border-whisper rounded-xl p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h3 className="text-base font-semibold">内容数据</h3>
            <p className="mt-2 text-sm text-steel leading-relaxed max-w-xl">
              包含文章、评论、分类、标签、站点设置和脱敏用户资料。用户密码哈希不会导出, 上传文件会以
              URL 引用保留在 JSON 中。
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="btn-primary !py-2 !px-4 text-sm"
          >
            <Download size={15} />
            {exportMutation.isPending ? '生成中…' : '下载 JSON'}
          </button>
        </div>

        {exportMutation.isError && (
          <p className="mt-4 text-sm text-red-600">{(exportMutation.error as Error).message}</p>
        )}
      </section>

      <section className="bg-surface border border-whisper rounded-xl p-6">
        <p className="font-mono text-xs text-steel tracking-[0.08em] inline-flex items-center gap-2 mb-3">
          <ShieldCheck size={13} />
          SCOPE
        </p>
        <ul className="space-y-2 text-sm text-steel">
          <li>导出文件是只读快照,不会修改数据库。</li>
          <li>
            适合内容迁移和人工审计；生产级灾备仍使用 `scripts/backup.sh` 的 SQL + uploads 备份。
          </li>
          <li>后续可以在此基础上扩展为 zip,把 uploads 一起打包。</li>
        </ul>
      </section>
    </div>
  )
}
