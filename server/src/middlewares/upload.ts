import { extname } from 'node:path'
import type { Request, RequestHandler } from 'express'
import multer, { MulterError } from 'multer'
import { BadRequestError } from '../utils/errors.js'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ext = extname(file.originalname).toLowerCase()
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    // Reject with a tagged error so the route handler can return 400 instead of 500.
    return cb(new BadRequestError(`不支持的文件类型: ${file.mimetype || ext || '未知'}`))
  }
  cb(null, true)
}

const uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 },
})

/**
 * `upload.single('file')` wrapped so multer's own errors get translated into
 * our HttpError shape — otherwise LIMIT_FILE_SIZE bubbles up as a generic 500.
 */
export const uploadSingleImage: RequestHandler = (req, res, next) => {
  uploader.single('file')(req, res, (err: unknown) => {
    if (!err) return next()
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: { code: 'PAYLOAD_TOO_LARGE', message: `文件超出 ${MAX_BYTES / 1024 / 1024}MB 上限` },
        })
      }
      return next(new BadRequestError(`上传失败: ${err.message}`))
    }
    next(err)
  })
}

export const UPLOAD_LIMITS = {
  maxBytes: MAX_BYTES,
  allowedMime: [...ALLOWED_MIME],
  allowedExt: [...ALLOWED_EXT],
}
