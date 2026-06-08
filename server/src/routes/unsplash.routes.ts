import { Router } from 'express'
import * as unsplashController from '../controllers/unsplash.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const unsplashRouter: Router = Router()

unsplashRouter.get('/search', requireAuth, unsplashController.searchPhotos)
unsplashRouter.get('/random', requireAuth, unsplashController.randomPhoto)
