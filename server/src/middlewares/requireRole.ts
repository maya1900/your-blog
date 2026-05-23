import type { RequestHandler } from 'express'
import type { Role } from '@prisma/client'
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js'

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError())
    if (!roles.includes(req.user.role)) return next(new ForbiddenError())
    next()
  }
}
