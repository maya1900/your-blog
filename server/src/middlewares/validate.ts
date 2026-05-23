import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'

interface Schemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

/**
 * Zod-backed request validation. On success, replaces req.body / req.query /
 * req.params with the parsed (and possibly transformed) values. On failure
 * delegates to errorMiddleware which formats ZodError into a 400 response.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query)
        Object.assign(req.query as object, parsed)
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params)
        Object.assign(req.params as object, parsed)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
