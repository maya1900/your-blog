export function AdminPlaceholder() {
  return (
    <div className="min-h-[100dvh] bg-canvas p-10">
      <p className="text-xs text-steel tracking-[0.04em] font-mono mb-6 inline-flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
        M1 · ADMIN ACCESS GRANTED
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">管理后台</h1>
      <p className="mt-3 text-steel">
        你以 ADMIN 身份访问到了这里 — 权限守卫工作正常。
        完整后台将在 M6 实现。
      </p>
    </div>
  )
}
