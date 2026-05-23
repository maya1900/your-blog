import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../utils/errors.js'

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.flatten().fieldErrors,
      },
    })
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err)

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  })
}
