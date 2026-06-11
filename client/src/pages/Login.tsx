import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Link } from '@/components/Link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { login, type LoginPayload } from '@/api/auth'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  identifier: z.string().min(1, '请输入用户名或邮箱'),
  password: z.string().min(1, '请输入密码'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const setSession = useAuthStore((s) => s.setSession)
  const qc = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: ({ user, token }) => {
      setSession(user, token)
      qc.setQueryData(['me'], user)
      navigate(location.state?.from ?? '/', { replace: true, viewTransition: true })
    },
    onError: (err: Error) => {
      setServerError(err.message || '登录失败')
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
          <h1 className="text-3xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mt-2 text-steel">登录账号继续写点想说的</p>
        </div>

        <div className="bg-surface border border-whisper rounded-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="field-label">USERNAME / EMAIL</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="username 或 you@example.com"
                className="input"
                {...register('identifier')}
              />
              {errors.identifier && (
                <p className="mt-1.5 text-sm text-red-600">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label className="field-label">PASSWORD</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
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
              {mutation.isPending ? '登录中…' : '登录'}
              {!mutation.isPending && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-steel">
          还没有账号?{' '}
          <Link to="/register" className="text-klein hover:text-klein-deep font-medium">
            立即注册 →
          </Link>
        </p>
      </div>
    </div>
  )
}
