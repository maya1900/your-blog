import { Router } from 'express'
import * as articleController from '../controllers/article.controller.js'
import * as interactionController from '../controllers/interaction.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const articleRouter: Router = Router()

articleRouter.get('/', articleController.list)
// IMPORTANT: by-id route MUST be declared before /:slug so Express doesn't
// route "by-id" through the slug handler.
articleRouter.get('/by-id/:id', requireAuth, articleController.getById)
// `/:slug/export` is two segments — won't be shadowed by `/:slug` — but listing
// it before keeps the read endpoints visually together.
articleRouter.get('/:slug/export', articleController.exportBySlug)
articleRouter.get('/:slug', articleController.getBySlug)
articleRouter.post('/', requireAuth, articleController.create)
articleRouter.put('/:id', requireAuth, articleController.update)
articleRouter.delete('/:id', requireAuth, articleController.remove)
articleRouter.post('/:id/publish', requireAuth, articleController.publish)

// Interaction toggles (POST with empty body). Composite-PK upsert keeps them
// idempotent at the DB level.
articleRouter.post('/:id/like', requireAuth, interactionController.toggleLike)
articleRouter.post('/:id/favorite', requireAuth, interactionController.toggleFavorite)
