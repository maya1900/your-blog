import { Router } from 'express'
import * as analyticsController from '../controllers/analytics.controller.js'

export const analyticsRouter: Router = Router()

analyticsRouter.post('/pageview', analyticsController.trackPageView)
