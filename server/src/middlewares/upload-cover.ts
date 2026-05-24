import type { Request, RequestHandler } from 'express'
import { extname } from 'node:path'
import multer, { MulterError } from 'multer'
import { BadRequestError } from '../utils/errors.js'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB raw — sharp will compress to JPEG after

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
    return cb(new BadRequestError(`不支持的文件类型: ${file.mimetype || ext || '未知'}`))
  }
  cb(null, true)
}

const uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 },
})

/** Single cover file in memory under field name `file`. sharp processes it next. */
export const uploadSingleCover: RequestHandler = (req, res, next) => {
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
