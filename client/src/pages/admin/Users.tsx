import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Pencil,
  Search as SearchIcon,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import {
  listUsers,
  resetUserPassword,
  updateUser,
  type AdminUser,
  type UpdateUserInput,
} from '@/api/admin'
import { AvatarEditor } from '@/components/AvatarEditor'
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
  const [editing, setEditing] = useState<AdminUser | null>(null)

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
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) =>
      updateUser(id, input),
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
            管理所有用户资料 / 角色 / 启用状态 · 共{' '}
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
              <th className="text-right" style={{ width: 240 }}>
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
                  onEdit={() => setEditing(u)}
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

      {editing && (
        <UserEditDialog
          user={editing}
          isSelf={editing.id === meId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
            qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
          }}
        />
      )}
    </div>
  )
}

function UserRow({
  user,
  isSelf,
  updating,
  onEdit,
  onToggleRole,
  onToggleActive,
}: {
  user: AdminUser
  isSelf: boolean
  updating: boolean
  onEdit: () => void
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
          <button
            className="btn-secondary !py-1 !px-2.5 !text-[12px]"
            onClick={onEdit}
            title="编辑资料"
          >
            <Pencil size={12} />
            编辑
          </button>
          {isSelf ? (
            <span className="font-mono text-[12px] text-steel">本人</span>
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

// ============ Edit dialog ============

function UserEditDialog({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: AdminUser
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [bio, setBio] = useState(user.bio ?? '')
  const [avatar, setAvatar] = useState<string | null>(user.avatar)
  const [role, setRole] = useState<Role>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [error, setError] = useState<string | null>(null)

  const saveMu = useMutation({
    mutationFn: () => {
      const input: UpdateUserInput = {}
      if (username.trim() !== user.username) input.username = username.trim()
      if (email.trim() !== user.email) input.email = email.trim()
      if ((bio || '') !== (user.bio ?? '')) input.bio = bio || null
      if ((avatar ?? null) !== (user.avatar ?? null)) input.avatar = avatar || null
      if (role !== user.role) input.role = role
      if (isActive !== user.isActive) input.isActive = isActive
      return updateUser(user.id, input)
    },
    onSuccess: () => onSaved(),
    onError: (err: Error) => setError(err.message),
  })

  const dirty =
    username.trim() !== user.username ||
    email.trim() !== user.email ||
    (bio || '') !== (user.bio ?? '') ||
    (avatar ?? null) !== (user.avatar ?? null) ||
    role !== user.role ||
    isActive !== user.isActive

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-whisper rounded-xl w-full max-w-2xl p-6 shadow-lg my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold">编辑用户</h3>
          <span className="font-mono text-xs text-steel">ID #{user.id}</span>
        </div>
        <p className="text-sm text-steel mb-6">
          作为管理员,你可以修改用户的资料、角色和启用状态。
        </p>

        {/* Avatar */}
        <div className="mb-6">
          <p className="field-label mb-2">头像</p>
          <AvatarEditor
            value={avatar}
            onChange={setAvatar}
            fallback={username}
            size="sm"
          />
        </div>

        {/* Two-column form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="u-username">
              用户名
            </label>
            <input
              id="u-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              className="input"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="u-email">
              邮箱
            </label>
            <input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={120}
              className="input font-mono text-[13px]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="field-label" htmlFor="u-bio">
            简介
          </label>
          <textarea
            id="u-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            placeholder="一两句话介绍。最多 200 字。"
            className="input resize-none"
          />
          <p
            className={cn(
              'mt-1 font-mono text-xs text-right',
              bio.length > 180 ? 'text-amber-600' : 'text-steel',
            )}
          >
            {bio.length} / 200
          </p>
        </div>

        {/* Role + active */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="field-label">角色</p>
            <div className="flex gap-2">
              {(['USER', 'ADMIN'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={isSelf && r !== user.role}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition',
                    role === r
                      ? 'border-klein bg-klein-tint text-klein'
                      : 'border-whisper text-steel hover:border-klein hover:text-klein',
                    isSelf && r !== user.role && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {r === 'ADMIN' ? '管理员' : '普通用户'}
                </button>
              ))}
            </div>
            {isSelf && (
              <p className="mt-1.5 font-mono text-xs text-steel">本人,角色不可改</p>
            )}
          </div>

          <div>
            <p className="field-label">启用状态</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition',
                  isActive
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-whisper text-steel hover:border-emerald-300 hover:text-emerald-700',
                )}
              >
                启用
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                disabled={isSelf}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition',
                  !isActive
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-whisper text-steel hover:border-red-300 hover:text-red-700',
                  isSelf && 'opacity-40 cursor-not-allowed',
                )}
              >
                禁用
              </button>
            </div>
            {isSelf && (
              <p className="mt-1.5 font-mono text-xs text-steel">本人,不能禁用</p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-whisper flex items-center justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary !py-2 !px-5 text-sm"
            disabled={
              !dirty ||
              saveMu.isPending ||
              username.trim().length < 3 ||
              !email.trim()
            }
            onClick={() => {
              setError(null)
              saveMu.mutate()
            }}
          >
            {saveMu.isPending ? '保存中…' : '保存修改'}
          </button>
        </div>

        {/* Password reset — separate block, separate mutation */}
        <PasswordResetSection userId={user.id} username={user.username} />
      </div>
    </div>
  )
}

function PasswordResetSection({
  userId,
  username,
}: {
  userId: number
  username: string
}) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mu = useMutation({
    mutationFn: () => resetUserPassword(userId, next),
    onSuccess: () => {
      setNext('')
      setConfirm('')
      setSavedAt(Date.now())
    },
    onError: (err: Error) => setError(err.message),
  })

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8
  const canSubmit =
    next.length >= 8 && confirm === next && !mu.isPending

  return (
    <div className="mt-6 pt-4 border-t border-whisper">
      <h4 className="text-base font-semibold mb-1">重置密码</h4>
      <p className="text-sm text-steel mb-4">
        以管理员身份直接为 <span className="font-mono">{username}</span>{' '}
        设置新密码,无需对方确认。建议改完通知用户。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="reset-new">
            新密码
          </label>
          <input
            id="reset-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="input font-mono"
          />
          {tooShort && <p className="mt-1 text-xs text-amber-600">至少 8 位</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="reset-confirm">
            确认新密码
          </label>
          <input
            id="reset-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="input font-mono"
          />
          {mismatch && (
            <p className="mt-1 text-xs text-red-600">两次输入不一致</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setSavedAt(null)
            mu.mutate()
          }}
          disabled={!canSubmit}
          className="btn-secondary !py-2 !px-4 text-sm"
        >
          {mu.isPending ? '提交中…' : '重置密码'}
        </button>
        {error && <p className="text-sm text-red-600 ml-auto">{error}</p>}
        {!error && savedAt && (
          <p className="text-sm text-emerald-700 ml-auto">密码已重置 ✓</p>
        )}
      </div>
    </div>
  )
}
