import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { register as registerApi, type RegisterPayload } from '@/api/auth'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(32, '用户名最多 32 个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '只允许字母、数字、下划线、连字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位').max(64, '密码最多 64 位'),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const qc = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (payload: RegisterPayload) => registerApi(payload),
    onSuccess: ({ user, token }) => {
      setSession(user, token)
      qc.setQueryData(['me'], user)
      navigate('/', { replace: true })
    },
    onError: (err: Error) => {
      setServerError(err.message || '注册失败')
    },
  })

  const onSubmit = (values: FormValues) => {
    setServerError(null)
    mutation.mutate(values)
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-canvas relative overflow-hidden">
      <div className="absolute inset-0 hairline-grid pointer-events-none" />
      <div className="absolute -left-[200px] -top-[180px] w-[720px] h-[720px] rounded-full pointer-events-none aurora-blob aurora-1" />
      <div className="absolute -right-[120px] -bottom-[80px] w-[600px] h-[600px] rounded-full pointer-events-none aurora-blob aurora-2" />

      <div className="relative w-full max-w-[440px]">
        <div className="text-center mb-10">
          <p className="text-xs text-steel tracking-[0.04em] font-mono mb-4 inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-klein" />
            EST. 2026 · A SLOW BLOG
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">加入墨记</h1>
          <p className="mt-2 text-steel">注册一个账号,开始写点想说的</p>
        </div>

        <div className="bg-white border border-whisper rounded-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="field-label">USERNAME</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="3-32 字符 · 字母 / 数字 / _ / -"
                className="input"
                {...register('username')}
              />
              {errors.username && (
                <p className="mt-1.5 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="field-label">EMAIL</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="field-label">PASSWORD</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="至少 8 位"
                className="input"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {mutation.isPending ? '注册中…' : '创建账号'}
              {!mutation.isPending && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-steel">
          已有账号?{' '}
          <Link to="/login" className="text-klein hover:text-klein-deep font-medium">
            去登录 →
          </Link>
        </p>
      </div>
    </div>
  )
}
