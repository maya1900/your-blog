import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { adminSiteRouter } from './site.routes.js'

export const adminRouter: Router = Router()

// Every /api/admin/* requires authenticated ADMIN
adminRouter.use(requireAuth, requireRole('ADMIN'))

// Dashboard
adminRouter.get('/stats', adminController.stats)
adminRouter.get('/export', adminController.exportSite)

// Users
adminRouter.get('/users', adminController.listUsers)
adminRouter.patch('/users/:id', adminController.updateUser)
adminRouter.post('/users/:id/password', adminController.resetUserPassword)

// All comments
adminRouter.get('/comments', adminController.listAllComments)

// Categories CRUD (GET stays on /api/categories for public access)
adminRouter.post('/categories', adminController.createCategory)
adminRouter.put('/categories/:id', adminController.updateCategory)
adminRouter.delete('/categories/:id', adminController.deleteCategory)

// Tags delete
adminRouter.delete('/tags/:id', adminController.deleteTag)

// Site settings (about page etc.)
adminRouter.use('/site', adminSiteRouter)
