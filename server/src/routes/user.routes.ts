import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { ConflictError, UnauthorizedError } from '../utils/errors.js'
import { paginated, skipTake, type PaginationInput } from '../utils/pagination.js'

export const userRouter: Router = Router()

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

/** Editable subset of the user profile. Email + role + isActive stay locked. */
const UpdateMeSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, '用户名至少 3 个字符')
      .max(32, '用户名最多 32 个字符')
      .regex(/^[a-zA-Z0-9_\-一-龥]+$/, '只允许字母、数字、下划线、连字符、中文')
      .optional(),
    bio: z
      .string()
      .max(200, '简介最多 200 字')
      .nullable()
      .optional(),
    avatar: z
      .string()
      .max(512)
      .nullable()
      .optional()
      .refine(
        (v) =>
          v === undefined ||
          v === null ||
          v === '' ||
          v.startsWith('/') ||
          /^https?:\/\//.test(v),
        '头像必须是 http(s):// 链接或 /uploads/… 路径',
      ),
  })
  .refine(
    (v) =>
      v.username !== undefined || v.bio !== undefined || v.avatar !== undefined,
    '未提供更新字段',
  )

/** GET /api/users/me/favorites — articles the viewer has favorited */
const listMyFavorites: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const input = PaginationQuery.parse(req.query)
    const pagination: PaginationInput = { page: input.page, pageSize: input.pageSize }

    const where = { userId: req.user.id }
    const [favs, total] = await prisma.$transaction([
      prisma.favorite.findMany({
        where,
        include: {
          article: {
            include: {
              author: { select: { id: true, username: true, avatar: true } },
              category: { select: { id: true, name: true, slug: true } },
              tags: { include: { tag: { select: { id: true, name: true } } } },
              _count: { select: { comments: true, likes: true, favorites: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...skipTake(pagination),
      }),
      prisma.favorite.count({ where }),
    ])

    // Shape: same as Article list — flatten tag relation and drop favorite wrapper
    const items = favs.map((f) => ({
      ...f.article,
      tags: f.article.tags.map((at) => at.tag),
      favoritedAt: f.createdAt,
    }))

    res.json({ data: paginated(items, total, pagination) })
  } catch (err) {
    next(err)
  }
}

/** PATCH /api/users/me — update editable profile fields */
const updateMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const input = UpdateMeSchema.parse(req.body)

    // Username uniqueness check (only when actually changing)
    if (input.username !== undefined) {
      const dup = await prisma.user.findFirst({
        where: { username: input.username, NOT: { id: req.user.id } },
      })
      if (dup) throw new ConflictError('用户名已被占用')
    }

    const data: import('@prisma/client').Prisma.UserUpdateInput = {}
    if (input.username !== undefined) data.username = input.username
    if (input.bio !== undefined) data.bio = input.bio || null
    if (input.avatar !== undefined) data.avatar = input.avatar || null

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        createdAt: true,
      },
    })
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

userRouter.get('/me/favorites', requireAuth, listMyFavorites)
userRouter.patch('/me', requireAuth, updateMe)
