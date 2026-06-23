import type { RequestHandler } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { prisma } from '../lib/prisma.js'
import type { JwtPayload } from '../utils/jwt.js'

/**
 * Optional auth. Parses `Authorization: Bearer <token>` if present and sets
 * `req.user`. Invalid / missing tokens are silently ignored — the route can
 * still proceed unauthenticated, and any downstream `requireAuth` handler will
 * enforce.
 */
export const auth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7)
    let payload: JwtPayload
    try {
      payload = verifyToken(token)
    } catch {
      return next()
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isActive: true },
      })
      if (user?.isActive) {
        req.user = { id: user.id, role: user.role }
      }
    } catch (err) {
      return next(err)
    }
  }
  next()
}
