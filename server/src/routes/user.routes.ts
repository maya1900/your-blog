import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { UnauthorizedError } from '../utils/errors.js'
import { paginated, skipTake, type PaginationInput } from '../utils/pagination.js'

export const userRouter: Router = Router()

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

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

userRouter.get('/me/favorites', requireAuth, listMyFavorites)
