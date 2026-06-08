import { Router } from 'express'
import * as uploadController from '../controllers/upload.controller.js'
import { requireAuth } from '../middlewares/requireAuth.js'
import { uploadSingleImage } from '../middlewares/upload.js'
import { uploadSingleCover } from '../middlewares/upload-cover.js'

export const uploadRouter: Router = Router()

uploadRouter.post('/image', requireAuth, uploadSingleImage, uploadController.uploadImage)
uploadRouter.post('/cover', requireAuth, uploadSingleCover, uploadController.uploadCover)
uploadRouter.post('/cover/random', requireAuth, uploadController.uploadCoverFromRandom)
uploadRouter.post('/cover/unsplash', requireAuth, uploadController.uploadCoverFromUnsplash)
uploadRouter.delete('/cover', requireAuth, uploadController.deleteCover)
