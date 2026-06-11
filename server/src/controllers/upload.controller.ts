import type { RequestHandler } from 'express'
import { relative } from 'node:path'
import { z } from 'zod'
import { BadRequestError } from '../utils/errors.js'
import { env } from '../config/env.js'
import {
  downloadImage,
  pickRandomCoverUrl,
  pingUnsplashDownload,
  processCoverBuffer,
  tryDeleteCoverFile,
} from '../services/cover.service.js'

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

/** Cover upload: memory file → sharp resize/crop to 16:9 → JPEG → disk. */
export const uploadCover: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      throw new BadRequestError('请选择要上传的文件 (字段名: file)')
    }
    const result = await processCoverBuffer(req.file.buffer)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

const RandomCoverSchema = z.object({
  source: z.enum(['picsum', 'unsplash']),
})

/** Pick a random remote cover (Picsum / Unsplash), download it, process, save. */
export const uploadCoverFromRandom: RequestHandler = async (req, res, next) => {
  try {
    const { source } = RandomCoverSchema.parse(req.body)
    const picked = await pickRandomCoverUrl(source)
    const buf = await downloadImage(picked.url)
    const result = await processCoverBuffer(buf)
    if (source === 'unsplash' && picked.downloadLocation) {
      pingUnsplashDownload(picked.downloadLocation)
    }
    res.status(201).json({ data: { ...result, source } })
  } catch (err) {
    next(err)
  }
}

const DeleteCoverSchema = z.object({
  url: z
    .string()
    .min(1)
    .max(512)
    .startsWith('/uploads/', '只能删除 /uploads/ 下的文件'),
})

/**
 * Delete a previously-uploaded cover. Used by the dropzone when the user
 * re-rolls / replaces / removes a random pick so we don't leak orphan files.
 *
 * Refuses to delete files still referenced by `article.coverUrl` (the user is
 * probably re-editing a published article and we'd be deleting a real cover).
 */
export const deleteCover: RequestHandler = async (req, res, next) => {
  try {
    const { url } = DeleteCoverSchema.parse(req.body)
    const result = await tryDeleteCoverFile(url)
    if (result.reason === 'invalid-path') {
      throw new BadRequestError('非法路径')
    }
    if (result.reason === 'referenced') {
      res.json({ data: { deleted: false, skipped: true, reason: 'referenced' } })
      return
    }
    res.json({ data: { deleted: result.deleted } })
  } catch (err) {
    next(err)
  }
}
