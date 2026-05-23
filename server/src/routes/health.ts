import { Router } from 'express'

export const healthRouter: Router = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({
    data: {
      ok: true,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
    },
  })
})
