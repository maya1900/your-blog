import { Router } from 'express'
import * as articleController from '../controllers/article.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const articleRouter: Router = Router()

articleRouter.get('/', articleController.list)
articleRouter.get('/:slug', articleController.getBySlug)
articleRouter.post('/', requireAuth, articleController.create)
articleRouter.put('/:id', requireAuth, articleController.update)
articleRouter.delete('/:id', requireAuth, articleController.remove)
articleRouter.post('/:id/publish', requireAuth, articleController.publish)
