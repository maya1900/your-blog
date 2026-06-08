import type { RequestHandler } from 'express'
import { z } from 'zod'
import { getRandomUnsplashPhoto, searchUnsplashPhotos } from '../services/unsplash.service.js'

const SearchSchema = z.object({
  query: z.string().trim().min(1, '请输入搜索词').max(60, '搜索词最多 60 字符'),
  page: z.coerce.number().int().positive().max(50).default(1),
  perPage: z.coerce.number().int().positive().max(24).default(12),
})

export const searchPhotos: RequestHandler = async (req, res, next) => {
  try {
    const input = SearchSchema.parse(req.query)
    const result = await searchUnsplashPhotos(input)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

const RandomSchema = z.object({
  query: z.string().trim().max(60).optional(),
})

export const randomPhoto: RequestHandler = async (req, res, next) => {
  try {
    const { query } = RandomSchema.parse(req.query)
    const result = await getRandomUnsplashPhoto(query)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

