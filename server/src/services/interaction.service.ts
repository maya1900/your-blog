import { prisma } from '../lib/prisma.js'
import { NotFoundError } from '../utils/errors.js'

/**
 * Toggle a user's like on an article. Returns the resulting state so the
 * client can update its UI without an extra round-trip.
 */
export async function toggleLike(articleId: number, userId: number) {
  await ensureArticle(articleId)

  const existing = await prisma.like.findUnique({
    where: { userId_articleId: { userId, articleId } },
  })

  if (existing) {
    await prisma.like.delete({
      where: { userId_articleId: { userId, articleId } },
    })
  } else {
    await prisma.like.create({ data: { userId, articleId } })
  }

  const count = await prisma.like.count({ where: { articleId } })
  return { liked: !existing, likeCount: count }
}

export async function toggleFavorite(articleId: number, userId: number) {
  await ensureArticle(articleId)

  const existing = await prisma.favorite.findUnique({
    where: { userId_articleId: { userId, articleId } },
  })

  if (existing) {
    await prisma.favorite.delete({
      where: { userId_articleId: { userId, articleId } },
    })
  } else {
    await prisma.favorite.create({ data: { userId, articleId } })
  }

  const count = await prisma.favorite.count({ where: { articleId } })
  return { favorited: !existing, favoriteCount: count }
}

async function ensureArticle(articleId: number) {
  const article = await prisma.article.findUnique({ where: { id: articleId } })
  if (!article) throw new NotFoundError('文章不存在')
}
