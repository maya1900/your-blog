import { Router } from 'express'
import * as uploadController from '../controllers/upload.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { uploadSingleImage } from '../middlewares/upload.js'

export const uploadRouter: Router = Router()

uploadRouter.post('/image', requireAuth, uploadSingleImage, uploadController.uploadImage)
