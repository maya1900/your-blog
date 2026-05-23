import { z } from 'zod'
import type { Role } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.js'
import { paginated, skipTake, type PaginationInput } from '../utils/pagination.js'

export const CreateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, '评论不能为空')
    .max(1000, '评论最多 1000 字'),
})

export const ListCommentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>
export type ListCommentsInput = z.infer<typeof ListCommentsSchema>

function commentInclude() {
  return {
    user: { select: { id: true, username: true, avatar: true } },
  } as const
}

export async function listComments(articleId: number, input: ListCommentsInput) {
  // Verify article exists (so we 404 instead of returning empty list silently)
  const article = await prisma.article.findUnique({ where: { id: articleId } })
  if (!article) throw new NotFoundError('文章不存在')

  const pagination: PaginationInput = {
    page: input.page,
    pageSize: input.pageSize,
  }
  const [items, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { articleId },
      include: commentInclude(),
      orderBy: { createdAt: 'desc' },
      ...skipTake(pagination),
    }),
    prisma.comment.count({ where: { articleId } }),
  ])

  return paginated(items, total, pagination)
}

export async function createComment(
  articleId: number,
  userId: number,
  input: CreateCommentInput,
) {
  const article = await prisma.article.findUnique({ where: { id: articleId } })
  if (!article) throw new NotFoundError('文章不存在')

  return prisma.comment.create({
    data: {
      content: input.content,
      articleId,
      userId,
    },
    include: commentInclude(),
  })
}

export async function deleteComment(
  commentId: number,
  viewer: { id: number; role: Role },
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { article: { select: { authorId: true } } },
  })
  if (!comment) throw new NotFoundError('评论不存在')

  // Authors can delete:
  // - their own comment
  // - any comment on their article
  // - admins can delete anything
  const isCommenter = comment.userId === viewer.id
  const isArticleAuthor = comment.article.authorId === viewer.id
  const isAdmin = viewer.role === 'ADMIN'
  if (!isCommenter && !isArticleAuthor && !isAdmin) {
    throw new ForbiddenError('无权删除该评论')
  }

  await prisma.comment.delete({ where: { id: commentId } })
}

export function requireUser(user: { id: number; role: Role } | undefined) {
  if (!user) throw new UnauthorizedError()
  return user
}
