import { z } from 'zod'
import { ArticleStatus, type Role } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { generateSlug, withSuffix } from '../utils/slug.js'
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors.js'
import { paginated, skipTake, type PaginationInput } from '../utils/pagination.js'

// ============ Zod schemas ============

export const CreateArticleSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 字符'),
  summary: z.string().max(200, '摘要最多 200 字符').optional(),
  content: z.string().min(1, '正文不能为空'),
  coverUrl: z.string().url('封面图必须是有效 URL').optional().or(z.literal('')),
  categoryId: z.coerce.number().int().positive('请选择分类'),
  tags: z.array(z.string().min(1).max(32)).max(6, '标签最多 6 个').default([]),
  status: z.nativeEnum(ArticleStatus).default(ArticleStatus.DRAFT),
})

export const UpdateArticleSchema = CreateArticleSchema.partial()

export const ListArticlesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  keyword: z.string().trim().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  tag: z.string().trim().optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  authorId: z.coerce.number().int().positive().optional(),
})

export type CreateArticleInput = z.infer<typeof CreateArticleSchema>
export type UpdateArticleInput = z.infer<typeof UpdateArticleSchema>
export type ListArticlesInput = z.infer<typeof ListArticlesSchema>

// ============ Helpers ============

async function uniqueSlug(title: string): Promise<string> {
  const base = generateSlug(title)
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : withSuffix(base)
    const existing = await prisma.article.findUnique({ where: { slug: candidate } })
    if (!existing) return candidate
  }
  // Extreme fallback — should be statistically impossible
  return withSuffix(base)
}

async function upsertTags(names: string[]) {
  const cleaned = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)))
  if (cleaned.length === 0) return []

  const tags = await Promise.all(
    cleaned.map((name) =>
      prisma.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      }),
    ),
  )
  return tags
}

async function ensureCategory(categoryId: number) {
  const cat = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!cat) throw new BadRequestError('分类不存在')
}

function articleInclude() {
  return {
    author: { select: { id: true, username: true, avatar: true } },
    category: { select: { id: true, name: true, slug: true } },
    tags: { include: { tag: { select: { id: true, name: true } } } },
    _count: { select: { comments: true, likes: true, favorites: true } },
  } as const
}

// ============ Operations ============

export async function listArticles(input: ListArticlesInput, viewer?: { id: number; role: Role }) {
  const where: import('@prisma/client').Prisma.ArticleWhereInput = {}

  if (input.keyword) {
    where.title = { contains: input.keyword }
  }
  if (input.categoryId) where.categoryId = input.categoryId
  if (input.tag) where.tags = { some: { tag: { name: input.tag } } }
  if (input.authorId) where.authorId = input.authorId

  // Status visibility:
  //   - viewer is admin or the author themselves → respect the explicit status filter (or all)
  //   - otherwise → force PUBLISHED only
  const isPrivileged =
    viewer?.role === 'ADMIN' || (input.authorId && viewer?.id === input.authorId)

  if (isPrivileged) {
    if (input.status) where.status = input.status
  } else {
    where.status = ArticleStatus.PUBLISHED
  }

  const pagination: PaginationInput = { page: input.page, pageSize: input.pageSize }
  const [items, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      include: articleInclude(),
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      ...skipTake(pagination),
    }),
    prisma.article.count({ where }),
  ])

  return paginated(items.map(flattenTags), total, pagination)
}

export async function getArticleBySlug(slug: string, viewer?: { id: number; role: Role }) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: articleInclude(),
  })
  if (!article) throw new NotFoundError('文章不存在')

  // Drafts are visible only to author or admin
  if (article.status === ArticleStatus.DRAFT) {
    if (!viewer || (viewer.role !== 'ADMIN' && viewer.id !== article.authorId)) {
      throw new NotFoundError('文章不存在')
    }
  }

  // Increment view count for published articles (fire and forget, errors swallowed)
  if (article.status === ArticleStatus.PUBLISHED) {
    void prisma.article
      .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined)
  }

  // Viewer-specific interaction state (cheap lookups by composite PK)
  let liked = false
  let favorited = false
  if (viewer) {
    const [likeRow, favRow] = await Promise.all([
      prisma.like.findUnique({
        where: { userId_articleId: { userId: viewer.id, articleId: article.id } },
      }),
      prisma.favorite.findUnique({
        where: { userId_articleId: { userId: viewer.id, articleId: article.id } },
      }),
    ])
    liked = !!likeRow
    favorited = !!favRow
  }

  return { ...flattenTags(article), liked, favorited }
}

export async function getArticleById(id: number) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: articleInclude(),
  })
  if (!article) throw new NotFoundError('文章不存在')
  return flattenTags(article)
}

export async function createArticle(authorId: number, input: CreateArticleInput) {
  await ensureCategory(input.categoryId)
  const slug = await uniqueSlug(input.title)
  const tags = await upsertTags(input.tags)

  const data: import('@prisma/client').Prisma.ArticleCreateInput = {
    title: input.title,
    slug,
    summary: input.summary || null,
    content: input.content,
    coverUrl: input.coverUrl || null,
    status: input.status,
    publishedAt: input.status === ArticleStatus.PUBLISHED ? new Date() : null,
    author: { connect: { id: authorId } },
    category: { connect: { id: input.categoryId } },
    tags: {
      create: tags.map((t) => ({ tag: { connect: { id: t.id } } })),
    },
  }

  const article = await prisma.article.create({ data, include: articleInclude() })
  return flattenTags(article)
}

export async function updateArticle(
  articleId: number,
  viewer: { id: number; role: Role },
  input: UpdateArticleInput,
) {
  const existing = await prisma.article.findUnique({ where: { id: articleId } })
  if (!existing) throw new NotFoundError('文章不存在')
  if (existing.authorId !== viewer.id && viewer.role !== 'ADMIN') {
    throw new ForbiddenError('无权编辑该文章')
  }
  if (input.categoryId) await ensureCategory(input.categoryId)

  const data: import('@prisma/client').Prisma.ArticleUpdateInput = {}
  if (input.title !== undefined) data.title = input.title
  if (input.summary !== undefined) data.summary = input.summary || null
  if (input.content !== undefined) data.content = input.content
  if (input.coverUrl !== undefined) data.coverUrl = input.coverUrl || null
  if (input.categoryId !== undefined)
    data.category = { connect: { id: input.categoryId } }
  if (input.status !== undefined) {
    data.status = input.status
    if (
      input.status === ArticleStatus.PUBLISHED &&
      existing.status === ArticleStatus.DRAFT
    ) {
      data.publishedAt = new Date()
    }
  }

  if (input.tags !== undefined) {
    const tags = await upsertTags(input.tags)
    await prisma.articleTag.deleteMany({ where: { articleId } })
    data.tags = {
      create: tags.map((t) => ({ tag: { connect: { id: t.id } } })),
    }
  }

  const updated = await prisma.article.update({
    where: { id: articleId },
    data,
    include: articleInclude(),
  })
  return flattenTags(updated)
}

export async function deleteArticle(articleId: number, viewer: { id: number; role: Role }) {
  const existing = await prisma.article.findUnique({ where: { id: articleId } })
  if (!existing) throw new NotFoundError('文章不存在')
  if (existing.authorId !== viewer.id && viewer.role !== 'ADMIN') {
    throw new ForbiddenError('无权删除该文章')
  }
  await prisma.article.delete({ where: { id: articleId } })
}

export async function publishArticle(articleId: number, viewer: { id: number; role: Role }) {
  const existing = await prisma.article.findUnique({ where: { id: articleId } })
  if (!existing) throw new NotFoundError('文章不存在')
  if (existing.authorId !== viewer.id && viewer.role !== 'ADMIN') {
    throw new ForbiddenError('无权发布该文章')
  }
  if (existing.status === ArticleStatus.PUBLISHED) {
    return getArticleById(articleId)
  }
  await prisma.article.update({
    where: { id: articleId },
    data: { status: ArticleStatus.PUBLISHED, publishedAt: new Date() },
  })
  return getArticleById(articleId)
}

// ============ Shape helper ============

type RawArticle = {
  tags: { tag: { id: number; name: string } }[]
} & Record<string, unknown>

function flattenTags<T extends RawArticle>(article: T) {
  const { tags, ...rest } = article
  return { ...rest, tags: tags.map((at) => at.tag) }
}
