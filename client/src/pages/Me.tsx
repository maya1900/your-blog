import { useAuthStore } from '@/stores/auth.store'

export function MePage() {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-16">
        <p className="text-steel">加载中…</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-16">
      <p className="text-xs text-steel tracking-[0.04em] font-mono mb-6 inline-flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
        M1 · ME
      </p>

      <h1 className="text-3xl font-semibold tracking-tight">个人中心</h1>

      <div className="mt-8 border border-whisper rounded-xl bg-white p-6 max-w-xl">
        <dl className="grid grid-cols-[120px_1fr] gap-y-3 font-mono text-sm">
          <dt className="text-steel">USERNAME</dt>
          <dd className="text-ink">{user.username}</dd>

          <dt className="text-steel">EMAIL</dt>
          <dd className="text-ink">{user.email}</dd>

          <dt className="text-steel">ROLE</dt>
          <dd>
            <span
              className={
                user.role === 'ADMIN'
                  ? 'chip chip-active'
                  : 'chip'
              }
            >
              {user.role}
            </span>
          </dd>

          <dt className="text-steel">CREATED</dt>
          <dd className="text-ink">{new Date(user.createdAt).toLocaleString()}</dd>

          <dt className="text-steel">ACTIVE</dt>
          <dd className="text-ink">{String(user.isActive)}</dd>
        </dl>

        <p className="mt-6 text-sm text-steel">
          M2 起会在这里加上:我的文章 / 草稿 / 收藏 / 资料编辑。
        </p>
      </div>
    </div>
  )
}
