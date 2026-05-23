import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from './api/http'

export default function App() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink antialiased flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <p className="font-mono text-xs text-steel tracking-[0.04em] mb-4 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
          M0 · SCAFFOLD CHECK
        </p>
        <h1 className="text-4xl font-semibold tracking-tightest">墨记</h1>
        <p className="mt-2 text-steel">一个慢工出细活的技术博客 · 正在搭建中</p>

        <div className="mt-8 border border-whisper rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-steel tracking-[0.04em] mb-3">
            SERVER HEALTH
          </p>

          {isLoading && (
            <p className="font-mono text-sm text-steel">checking…</p>
          )}

          {isError && (
            <p className="font-mono text-sm text-red-600">
              ✗ {(error as Error).message}
            </p>
          )}

          {data && (
            <div className="font-mono text-sm space-y-1">
              <p>
                <span className="text-steel">ok:</span>{' '}
                <span className="text-emerald-signal">
                  {String(data.ok)}
                </span>
              </p>
              <p>
                <span className="text-steel">env:</span> {data.env}
              </p>
              <p>
                <span className="text-steel">timestamp:</span> {data.timestamp}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 font-mono text-xs text-steel tracking-[0.04em]">
          NEXT · M1 · USER AUTH
        </p>
      </div>
    </div>
  )
}
