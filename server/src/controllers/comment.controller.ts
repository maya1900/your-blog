import type { RequestHandler } from 'express'
import { z } from 'zod'
import * as commentService from '../services/comment.service.js'
import { UnauthorizedError } from '../utils/errors.js'

const ArticleIdParam = z.object({ articleId: z.coerce.number().int().positive() })
const CommentIdParam = z.object({ id: z.coerce.number().int().positive() })

export const list: RequestHandler = async (req, res, next) => {
  try {
    const { articleId } = ArticleIdParam.parse(req.params)
    const input = commentService.ListCommentsSchema.parse(req.query)
    const result = await commentService.listComments(articleId, input)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export const create: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { articleId } = ArticleIdParam.parse(req.params)
    const input = commentService.CreateCommentSchema.parse(req.body)
    const comment = await commentService.createComment(articleId, req.user.id, input)
    res.status(201).json({ data: comment })
  } catch (err) {
    next(err)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = CommentIdParam.parse(req.params)
    await commentService.deleteComment(id, req.user)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
