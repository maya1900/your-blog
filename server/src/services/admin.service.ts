import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors.js'
import {
  paginated,
  skipTake,
  type PaginationInput,
} from '../utils/pagination.js'
import { generateSlug, withSuffix } from '../utils/slug.js'

// ============ Zod schemas ============

export const ListUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  keyword: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
})

export const UpdateUserSchema = z
  .object({
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => v.role !== undefined || v.isActive !== undefined,
    '未提供更新字段',
  )

export const ListCommentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  keyword: z.string().trim().optional(),
})

export const CategoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '分类名不能为空')
    .max(32, '分类名最多 32 个字符'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/, 'slug 只允许字母、数字、连字符')
    .optional(),
})

export type ListUsersInput = z.infer<typeof ListUsersSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type ListCommentsInput = z.infer<typeof ListCommentsSchema>
export type CategoryInput = z.infer<typeof CategoryInputSchema>

// ============ Dashboard stats ============

export interface AdminStats {
  totals: {
    users: number
    articles: number
    published: number
    drafts: number
    comments: number
    categories: number
    tags: number
    views: number
    likes: number
    favorites: number
  }
  thisWeek: {
    articles: number
    comments: number
    users: number
  }
  trend: { date: string; count: number }[]
  topCategories: { id: number; name: string; count: number }[]
  recentArticles: {
    id: number
    title: string
    slug: string
    status: string
    viewCount: number
    createdAt: Date
    publishedAt: Date | null
    author: { id: number; username: string; avatar: string | null }
    category: { id: number; name: string } | null
  }[]
  recentComments: {
    id: number
    content: string
    createdAt: Date
    user: { id: number; username: string; avatar: string | null }
    article: { id: number; slug: string; title: string }
  }[]
}

/** Build a YYYY-MM-DD string in local time so chart days align with the viewer */
function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function getStats(): Promise<AdminStats> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    users,
    articles,
    published,
    drafts,
    comments,
    categoriesCount,
    tagsCount,
    viewAgg,
    likesCount,
    favoritesCount,
    weekArticles,
    weekComments,
    weekUsers,
    monthArticleRows,
    topCategoriesRaw,
    recentArticles,
    recentComments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.article.count(),
    prisma.article.count({ where: { status: 'PUBLISHED' } }),
    prisma.article.count({ where: { status: 'DRAFT' } }),
    prisma.comment.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.article.aggregate({ _sum: { viewCount: true } }),
    prisma.like.count(),
    prisma.favorite.count(),
    prisma.article.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.comment.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.article.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { createdAt: true },
    }),
    prisma.category.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.article.findMany({
      take: 6,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.comment.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        article: { select: { id: true, slug: true, title: true } },
      },
    }),
  ])

  // 30-day trend (one bucket per day; days with no posts → 0)
  const buckets = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    buckets.set(isoDay(d), 0)
  }
  for (const row of monthArticleRows) {
    const k = isoDay(row.createdAt)
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  const trend = Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    count,
  }))

  const topCategories = topCategoriesRaw
    .map((c) => ({ id: c.id, name: c.name, count: c._count.articles }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totals: {
      users,
      articles,
      published,
      drafts,
      comments,
      categories: categoriesCount,
      tags: tagsCount,
      views: viewAgg._sum.viewCount ?? 0,
      likes: likesCount,
      favorites: favoritesCount,
    },
    thisWeek: {
      articles: weekArticles,
      comments: weekComments,
      users: weekUsers,
    },
    trend,
    topCategories,
    recentArticles,
    recentComments,
  }
}

// ============ Users ============

export async function listUsers(input: ListUsersInput) {
  const where: import('@prisma/client').Prisma.UserWhereInput = {}
  if (input.keyword) {
    where.OR = [
      { username: { contains: input.keyword } },
      { email: { contains: input.keyword } },
    ]
  }
  if (input.role) where.role = input.role

  const pagination: PaginationInput = {
    page: input.page,
    pageSize: input.pageSize,
  }
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        createdAt: true,
        _count: { select: { articles: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...skipTake(pagination),
    }),
    prisma.user.count({ where }),
  ])

  return paginated(rows, total, pagination)
}

export async function updateUser(
  viewerId: number,
  targetId: number,
  input: UpdateUserInput,
) {
  const target = await prisma.user.findUnique({ where: { id: targetId } })
  if (!target) throw new NotFoundError('用户不存在')

  // Guard: admins cannot lock themselves out
  if (viewerId === targetId) {
    if (input.role !== undefined && input.role !== target.role) {
      throw new ForbiddenError('不能修改自己的角色')
    }
    if (input.isActive === false) {
      throw new ForbiddenError('不能禁用自己的账号')
    }
  }

  const data: import('@prisma/client').Prisma.UserUpdateInput = {}
  if (input.role !== undefined) data.role = input.role
  if (input.isActive !== undefined) data.isActive = input.isActive

  const updated = await prisma.user.update({
    where: { id: targetId },
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
  return updated
}

// ============ All comments (admin view) ============

export async function listAllComments(input: ListCommentsInput) {
  const where: import('@prisma/client').Prisma.CommentWhereInput = {}
  if (input.keyword) {
    where.content = { contains: input.keyword }
  }

  const pagination: PaginationInput = {
    page: input.page,
    pageSize: input.pageSize,
  }
  const [items, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        article: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...skipTake(pagination),
    }),
    prisma.comment.count({ where }),
  ])

  return paginated(items, total, pagination)
}

// ============ Categories CRUD ============

async function uniqueCategorySlug(base: string, ignoreId?: number): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : withSuffix(base)
    const existing = await prisma.category.findUnique({ where: { slug: candidate } })
    if (!existing || existing.id === ignoreId) return candidate
  }
  return withSuffix(base)
}

export async function createCategory(input: CategoryInput) {
  const dup = await prisma.category.findUnique({ where: { name: input.name } })
  if (dup) throw new ConflictError('分类名已存在')

  const desired = input.slug || generateSlug(input.name)
  const slug = await uniqueCategorySlug(desired)
  return prisma.category.create({ data: { name: input.name, slug } })
}

export async function updateCategory(id: number, input: CategoryInput) {
  const target = await prisma.category.findUnique({ where: { id } })
  if (!target) throw new NotFoundError('分类不存在')

  if (input.name !== target.name) {
    const dup = await prisma.category.findUnique({ where: { name: input.name } })
    if (dup && dup.id !== id) throw new ConflictError('分类名已存在')
  }

  const data: import('@prisma/client').Prisma.CategoryUpdateInput = {
    name: input.name,
  }
  if (input.slug && input.slug !== target.slug) {
    data.slug = await uniqueCategorySlug(input.slug, id)
  }
  return prisma.category.update({ where: { id }, data })
}

export async function deleteCategory(id: number) {
  const target = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { articles: true } } },
  })
  if (!target) throw new NotFoundError('分类不存在')
  if (target._count.articles > 0) {
    throw new BadRequestError(
      `分类下还有 ${target._count.articles} 篇文章,无法删除`,
    )
  }
  await prisma.category.delete({ where: { id } })
}

// ============ Tags delete ============

export async function deleteTag(id: number) {
  const target = await prisma.tag.findUnique({ where: { id } })
  if (!target) throw new NotFoundError('标签不存在')
  // ArticleTag rows reference the tag — clear them first
  await prisma.$transaction([
    prisma.articleTag.deleteMany({ where: { tagId: id } }),
    prisma.tag.delete({ where: { id } }),
  ])
}
