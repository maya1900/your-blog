import type { RequestHandler } from 'express'
import { relative } from 'node:path'
import { BadRequestError } from '../utils/errors.js'
import { env } from '../config/env.js'

export const uploadImage: RequestHandler = (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('请选择要上传的文件 (字段名: file)')
    }
    // multer.diskStorage gives `path` like "<UPLOAD_ROOT>/202605/abc123.png".
    // Strip the configurable root, then expose under /uploads/* served by nginx (prod) or Express (dev).
    const rel = relative(env.UPLOAD_ROOT, req.file.path).replace(/\\/g, '/')
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
