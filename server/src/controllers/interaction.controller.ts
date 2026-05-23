import type { RequestHandler } from 'express'
import { z } from 'zod'
import * as interactionService from '../services/interaction.service.js'
import { UnauthorizedError } from '../utils/errors.js'

const IdParam = z.object({ id: z.coerce.number().int().positive() })

export const toggleLike: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    const result = await interactionService.toggleLike(id, req.user.id)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

export const toggleFavorite: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError()
    const { id } = IdParam.parse(req.params)
    const result = await interactionService.toggleFavorite(id, req.user.id)
    res.json({ data: result })
  } catch (err) {
    next(err)
  }
}
