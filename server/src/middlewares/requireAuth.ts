import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../utils/errors.js'

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError())
  }
  next()
}
