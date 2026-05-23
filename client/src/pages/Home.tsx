import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '@/api/http'
import { useAuthStore } from '@/stores/auth.store'

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
      <p className="text-xs text-steel tracking-[0.04em] font-mono mb-6 inline-flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
        M1 · USER AUTH
      </p>

      <h1 className="text-4xl font-semibold tracking-tightest">
        欢迎{user ? `,${user.username}` : ''}
      </h1>
      <p className="mt-3 text-steel">
        {user
          ? '你已登录。M2 起会在这里逐步实现文章列表、详情、写作等功能。'
          : '访客视角。M2 起会在这里实现文章列表、详情等功能。'}
      </p>

      <div className="mt-8 border border-whisper rounded-xl bg-white p-5 max-w-md">
        <p className="text-xs text-steel tracking-[0.04em] font-mono mb-3">SERVER HEALTH</p>
        {isLoading ? (
          <p className="font-mono text-sm text-steel">checking…</p>
        ) : data ? (
          <div className="font-mono text-sm space-y-1">
            <p>
              <span className="text-steel">ok:</span>{' '}
              <span className="text-emerald-signal">{String(data.ok)}</span>
            </p>
            <p>
              <span className="text-steel">env:</span> {data.env}
            </p>
            <p>
              <span className="text-steel">time:</span> {data.timestamp}
            </p>
          </div>
        ) : (
          <p className="font-mono text-sm text-red-600">✗ server unreachable</p>
        )}
      </div>
    </div>
  )
}
