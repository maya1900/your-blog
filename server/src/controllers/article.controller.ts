import type { RequestHandler } from 'express'
import { z } from 'zod'
import * as articleService from '../services/article.service.js'
import { UnauthorizedError, BadRequestError } from '../utils/errors.js'

const IdParam = z.object({ id: z.coerce.number().int().positive() })
const SlugParam = z.object({ slug: z.string().min(1).max(100) })

export const list: RequestHandler = async (req, res, next) => {
  try {
    const input = articleService.ListArticlesSchema.parse(req.query)
    const result = await articleService.listArticles(input, req.user)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export const getBySlug: RequestHandler = async (req, res, next) => {
  try {
    const { slug } = SlugParam.parse(req.params)
    const article = await articleService.getArticleBySlug(slug, req.user)
    res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

export const create: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const input = articleService.CreateArticleSchema.parse(req.body)
    const article = await articleService.createArticle(req.user.id, input)
    res.status(201).json({ data: article })
  } catch (err) {
    next(err)
  }
}

export const update: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    const input = articleService.UpdateArticleSchema.parse(req.body)
    if (Object.keys(input).length === 0) throw new BadRequestError('未提供更新字段')
    const article = await articleService.updateArticle(id, req.user, input)
    res.json({ data: article })
  } catch (err) {
    next(err)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    await articleService.deleteArticle(id, req.user)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export const publish: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    const article = await articleService.publishArticle(id, req.user)
    res.json({ data: article })
  } catch (err) {
    next(err)
  }
}
