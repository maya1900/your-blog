import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import { auth } from './middlewares/auth.js'
import { errorMiddleware } from './middlewares/error.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.routes.js'

export function createApp(): Express {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  // Static uploads
  app.use('/uploads', express.static('uploads', { maxAge: '7d' }))

  // Parse JWT into req.user if present (optional)
  app.use(auth)

  // API routes
  app.use('/api', healthRouter)
  app.use('/api/auth', authRouter)

  // 404 fallthrough
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  })

  app.use(errorMiddleware)

  return app
}
