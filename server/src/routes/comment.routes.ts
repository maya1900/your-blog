import { Router } from 'express'
import * as commentController from '../controllers/comment.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'

/**
 * Comment routes mounted at `/api/articles/:articleId/comments`.
 * Per-article scoping makes URLs readable and lets us 404 cleanly when the
 * article doesn't exist.
 */
export const commentRouter: Router = Router({ mergeParams: true })

commentRouter.get('/', commentController.list)
commentRouter.post('/', requireAuth, commentController.create)
commentRouter.delete('/:id', requireAuth, commentController.remove)
