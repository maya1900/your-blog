import type { RequestHandler } from 'express'
import { BadRequestError } from '../utils/errors.js'

export const uploadImage: RequestHandler = (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('请选择要上传的文件 (字段名: file)')
    }
    // multer.diskStorage gives us `path` like "uploads/202605/abc123.png".
    // We rewrite to a public URL served by app.use('/uploads', static(...)).
    const rel = req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '')
    const url = `/uploads/${rel}`

    res.status(201).json({
      data: {
        url,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    })
  } catch (err) {
    next(err)
  }
}
