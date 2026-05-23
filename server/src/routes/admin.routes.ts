import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { requireRole } from '../middlewares/requireRole.js'

export const adminRouter: Router = Router()

// Every /api/admin/* requires authenticated ADMIN
adminRouter.use(requireAuth, requireRole('ADMIN'))

// Dashboard
adminRouter.get('/stats', adminController.stats)

// Users
adminRouter.get('/users', adminController.listUsers)
adminRouter.patch('/users/:id', adminController.updateUser)

// All comments
adminRouter.get('/comments', adminController.listAllComments)

// Categories CRUD (GET stays on /api/categories for public access)
adminRouter.post('/categories', adminController.createCategory)
adminRouter.put('/categories/:id', adminController.updateCategory)
adminRouter.delete('/categories/:id', adminController.deleteCategory)

// Tags delete
adminRouter.delete('/tags/:id', adminController.deleteTag)
