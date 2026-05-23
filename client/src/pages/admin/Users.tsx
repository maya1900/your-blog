import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Search as SearchIcon, ShieldCheck, UserCog } from 'lucide-react'
import { listUsers, updateUser, type AdminUser } from '@/api/admin'
import { useDebounce } from '@/hooks/useDebounce'
import { useUrlNumberParam, useUrlParam } from '@/hooks/useUrlParam'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate } from '@/utils/format'
import { Pagination } from '@/components/Pagination'
import { cn } from '@/utils/cn'
import type { Role } from '@/types/api'

export function AdminUsersPage() {
  const [keyword, setKeyword] = useUrlParam('keyword', '')
  const [roleFilter, setRoleFilter] = useUrlParam('role', '')
  const [page, setPage] = useUrlNumberParam('page', 1)
  const pageSize = 15
  const debouncedKeyword = useDebounce(keyword, 300)

  const qc = useQueryClient()
  const meId = useAuthStore((s) => s.user?.id)

  const params = useMemo(
    () => ({
      page,
      pageSize,
      keyword: debouncedKeyword || undefined,
      role: (roleFilter || undefined) as Role | undefined,
    }),
    [page, debouncedKeyword, roleFilter],
  )

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => listUsers(params),
  })

  const updateMu = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: { role?: Role; isActive?: boolean }
    }) => updateUser(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err: Error) => alert(err.message),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = data?.pageCount ?? 1

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">用户管理</h2>
          <p className="mt-1 text-steel">
            管理所有用户的角色与启用状态 · 共{' '}
            <span className="font-mono text-ink">{total}</span> 位用户
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-[280px]">
          <SearchIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              if (page !== 1) setPage(1)
            }}
            placeholder="搜索用户名 / 邮箱…"
            className="admin-input pl-9 w-full"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="admin-input pr-8 appearance-none cursor-pointer"
          >
            <option value="">所有角色</option>
            <option value="ADMIN">管理员</option>
            <option value="USER">普通用户</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel pointer-events-none"
          />
        </div>
      </div>

      <div className="bg-white border border-whisper rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th className="text-right">ARTICLES</th>
              <th className="text-right">COMMENTS</th>
              <th>JOINED</th>
              <th className="text-right" style={{ width: 200 }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-steel">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-steel">
                  没有符合条件的用户
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === meId}
                  updating={updateMu.isPending}
                  onToggleRole={() =>
                    updateMu.mutate({
                      id: u.id,
                      input: { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' },
                    })
                  }
                  onToggleActive={() =>
                    updateMu.mutate({
                      id: u.id,
                      input: { isActive: !u.isActive },
                    })
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-mono text-[13px] text-steel">
          显示{' '}
          {items.length === 0
            ? 0
            : `${(page - 1) * pageSize + 1} - ${(page - 1) * pageSize + items.length}`}{' '}
          / 共 {total} 人
        </p>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        <div className="w-[120px]" />
      </div>
    </div>
  )
}

function UserRow({
  user,
  isSelf,
  updating,
  onToggleRole,
  onToggleActive,
}: {
  user: AdminUser
  isSelf: boolean
  updating: boolean
  onToggleRole: () => void
  onToggleActive: () => void
}) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full ring-1 ring-whisper bg-whisper-soft overflow-hidden flex items-center justify-center text-steel text-xs font-medium">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user.username[0]?.toUpperCase()
            )}
          </div>
          <div>
            <p className="font-medium text-ink">{user.username}</p>
            {user.bio && (
              <p className="text-[13px] text-steel line-clamp-1 max-w-[220px]">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="font-mono text-[13px] text-steel">{user.email}</td>
      <td>
        <span
          className={cn(
            'inline-flex items-center gap-1 h-[22px] px-2 rounded-chip text-xs font-medium',
            user.role === 'ADMIN'
              ? 'bg-klein-tint text-klein'
              : 'bg-whisper-soft text-steel',
          )}
        >
          {user.role === 'ADMIN' && <ShieldCheck size={11} />}
          {user.role}
        </span>
      </td>
      <td>
        <span
          className={cn(
            'inline-flex items-center h-[22px] px-2 rounded-chip text-xs font-medium',
            user.isActive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700',
          )}
        >
          {user.isActive ? 'ACTIVE' : 'DISABLED'}
        </span>
      </td>
      <td className="text-right font-mono text-[13px]">
        {user._count?.articles ?? 0}
      </td>
      <td className="text-right font-mono text-[13px]">
        {user._count?.comments ?? 0}
      </td>
      <td className="font-mono text-[13px] text-steel">
        {formatDate(user.createdAt)}
      </td>
      <td className="text-right">
        <div className="inline-flex items-center gap-2 justify-end">
          {isSelf ? (
            <span className="font-mono text-[12px] text-steel">本人,不可改</span>
          ) : (
            <>
              <button
                className="btn-secondary !py-1 !px-2.5 !text-[12px]"
                disabled={updating}
                onClick={onToggleRole}
                title={user.role === 'ADMIN' ? '降为普通用户' : '提升为管理员'}
              >
                <UserCog size={12} />
                {user.role === 'ADMIN' ? '降权' : '提权'}
              </button>
              <button
                className={cn(
                  'inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-[12px] font-medium border transition',
                  user.isActive
                    ? 'border-whisper text-steel hover:border-red-300 hover:text-red-600'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                )}
                disabled={updating}
                onClick={onToggleActive}
              >
                {user.isActive ? '禁用' : '启用'}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
