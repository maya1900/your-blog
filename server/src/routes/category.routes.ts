import { Router, type RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'

export const categoryRouter: Router = Router()

const list: RequestHandler = async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    })
    res.json({ data: categories })
  } catch (err) {
    next(err)
  }
}

categoryRouter.get('/', list)
