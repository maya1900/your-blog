import type { RequestHandler } from 'express'
import * as analyticsService from '../services/analytics.service.js'

export const trackPageView: RequestHandler = async (req, res, next) => {
  try {
    const input = analyticsService.PageViewSchema.parse(req.body)
    await analyticsService.trackPageView(input, req.user, {
      userAgent: req.get('user-agent') ?? undefined,
    })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
