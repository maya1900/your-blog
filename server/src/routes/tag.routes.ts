import { Router, type RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'

export const tagRouter: Router = Router()

const list: RequestHandler = async (_req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    })
    res.json({ data: tags })
  } catch (err) {
    next(err)
  }
}

tagRouter.get('/', list)
