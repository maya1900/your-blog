import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middlewares/validate.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { LoginSchema, RegisterSchema } from '../services/auth.service.js'

export const authRouter: Router = Router()

authRouter.post('/register', validate({ body: RegisterSchema }), authController.register)
authRouter.post('/login', validate({ body: LoginSchema }), authController.login)
authRouter.get('/me', requireAuth, authController.me)
