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
import { tryDeleteCoverFileSafe } from './cover.service.js'

// ============ Zod schemas ============

// Cover may be an absolute URL (https://...) OR a root-relative path returned
// by our upload endpoints (/uploads/...). z.string().url() rejects the latter.
const isCoverUrl = (v: string) =>
  v === '' || v.startsWith('/') || /^https?:\/\//.test(v)

export const CreateArticleSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 字符'),
  summary: z.string().max(200, '摘要最多 200 字符').optional(),
  content: z.string().min(1, '正文不能为空'),
  coverUrl: z
    .string()
    .max(512)
    .refine(isCoverUrl, '封面图必须是 http(s):// 链接或 /uploads/… 路径')
    .optional(),
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
    author: { select: { id: true, username: true, nickname: true, avatar: true } },
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

  // If the cover changed (including clearing it), try to garbage-collect the
  // old file. `tryDeleteCoverFileSafe` checks for other references first.
  if (
    input.coverUrl !== undefined &&
    existing.coverUrl &&
    existing.coverUrl !== updated.coverUrl
  ) {
    await tryDeleteCoverFileSafe(existing.coverUrl)
  }

  return flattenTags(updated)
}

export async function deleteArticle(articleId: number, viewer: { id: number; role: Role }) {
  const existing = await prisma.article.findUnique({ where: { id: articleId } })
  if (!existing) throw new NotFoundError('文章不存在')
  if (existing.authorId !== viewer.id && viewer.role !== 'ADMIN') {
    throw new ForbiddenError('无权删除该文章')
  }
  await prisma.article.delete({ where: { id: articleId } })
  // Article is gone — try to free its cover file too.
  await tryDeleteCoverFileSafe(existing.coverUrl)
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

/**
 * Build a portable Markdown representation of an article — YAML frontmatter
 * followed by the original Markdown body. Permission matches getArticleBySlug
 * (drafts only visible to author / admin); unlike that one this never bumps
 * viewCount.
 */
export async function exportArticleAsMarkdown(
  slug: string,
  viewer?: { id: number; role: Role },
): Promise<{ filename: string; markdown: string }> {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: articleInclude(),
  })
  if (!article) throw new NotFoundError('文章不存在')

  if (article.status === ArticleStatus.DRAFT) {
    if (!viewer || (viewer.role !== 'ADMIN' && viewer.id !== article.authorId)) {
      throw new NotFoundError('文章不存在')
    }
  }

  const flat = flattenTags(article)
  return {
    filename: `${article.slug}.md`,
    markdown: serializeArticleToMarkdown(flat),
  }
}

// JSON-quoted strings are valid YAML scalars (double-quoted flow form), so we
// piggy-back on JSON.stringify for escaping rather than pulling in a YAML lib.
function yamlScalar(s: string): string {
  return JSON.stringify(s)
}

function serializeArticleToMarkdown(article: {
  title: string
  slug: string
  summary: string | null
  content: string
  coverUrl: string | null
  status: ArticleStatus
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  category: { name: string } | null
  tags: { name: string }[]
  author: { username: string; nickname?: string | null } | null
}): string {
  const lines: string[] = ['---']
  lines.push(`title: ${yamlScalar(article.title)}`)
  lines.push(`slug: ${article.slug}`)
  lines.push(`status: ${article.status === ArticleStatus.PUBLISHED ? 'published' : 'draft'}`)
  if (article.publishedAt) lines.push(`publishedAt: ${article.publishedAt.toISOString()}`)
  lines.push(`createdAt: ${article.createdAt.toISOString()}`)
  lines.push(`updatedAt: ${article.updatedAt.toISOString()}`)
  if (article.category) lines.push(`category: ${yamlScalar(article.category.name)}`)
  if (article.tags.length > 0) {
    lines.push('tags:')
    for (const t of article.tags) lines.push(`  - ${yamlScalar(t.name)}`)
  }
  if (article.summary) lines.push(`excerpt: ${yamlScalar(article.summary)}`)
  if (article.coverUrl) lines.push(`coverImage: ${yamlScalar(article.coverUrl)}`)
  if (article.author) lines.push(`author: ${yamlScalar(article.author.nickname || article.author.username)}`)
  lines.push('---', '', article.content, '')
  return lines.join('\n')
}

// ============ Shape helper ============

type RawArticle = {
  tags: { tag: { id: number; name: string } }[]
} & Record<string, unknown>

function flattenTags<T extends RawArticle>(article: T) {
  const { tags, ...rest } = article
  return { ...rest, tags: tags.map((at) => at.tag) }
}
