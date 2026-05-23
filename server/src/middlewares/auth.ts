import type { RequestHandler } from 'express'
import { verifyToken } from '../utils/jwt.js'

/**
 * Optional auth. Parses `Authorization: Bearer <token>` if present and sets
 * `req.user`. Invalid / missing tokens are silently ignored — the route can
 * still proceed unauthenticated, and any downstream `requireAuth` handler will
 * enforce.
 */
export const auth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7)
    try {
      const payload = verifyToken(token)
      req.user = { id: payload.sub, role: payload.role }
    } catch {
      // invalid token → user stays unauthenticated
    }
  }
  next()
}
