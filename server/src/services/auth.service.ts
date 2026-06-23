import { z } from 'zod'
import type { Role, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js'

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(32, '用户名最多 32 个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '只允许字母、数字、下划线、连字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .max(64, '密码最多 64 位'),
})

export const LoginSchema = z.object({
  identifier: z.string().min(1, '用户名或邮箱不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

export interface SafeUser {
  id: number
  username: string
  nickname: string
  email: string
  role: Role
  avatar: string | null
  bio: string | null
  isActive: boolean
  createdAt: Date
}

function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user
  return safe
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: input.username }, { email: input.email }] },
  })
  if (existing) {
    const which = existing.username === input.username ? '用户名' : '邮箱'
    throw new ConflictError(`${which}已被占用`)
  }

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      username: input.username,
      nickname: input.username,
      email: input.email,
      passwordHash,
    },
  })

  const token = signToken({ sub: user.id, role: user.role })
  return { user: toSafeUser(user), token }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.identifier }, { email: input.identifier }],
    },
  })

  if (!user || !user.isActive) {
    throw new UnauthorizedError('用户名或密码错误')
  }

  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) {
    throw new UnauthorizedError('用户名或密码错误')
  }

  const token = signToken({ sub: user.id, role: user.role })
  return { user: toSafeUser(user), token }
}

export async function getMe(userId: number): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new NotFoundError('用户不存在')
  return toSafeUser(user)
}
