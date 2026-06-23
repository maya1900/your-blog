import type { RequestHandler } from 'express'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import sharp from 'sharp'
import { z } from 'zod'
import { BadRequestError } from '../utils/errors.js'
import { env } from '../config/env.js'
import { nanoid } from '../utils/nanoid.js'
import {
  downloadImage,
  pickRandomCoverUrl,
  pingUnsplashDownload,
  processCoverBuffer,
  tryDeleteCoverFile,
} from '../services/cover.service.js'

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

const EXT_TO_FORMAT: Record<string, string> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
  '.gif': 'gif',
}

function monthBucket(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

function mimeMatchesDecodedFormat(uploadedMime: string, decodedFormat: string | undefined) {
  if (!decodedFormat) return false
  const decodedMime = SHARP_FORMAT_TO_MIME[decodedFormat]
  if (!decodedMime) return false
  if (decodedMime === 'image/jpeg') return uploadedMime === 'image/jpeg' || uploadedMime === 'image/jpg'
  return uploadedMime === decodedMime
}

export const uploadImage: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      throw new BadRequestError('请选择要上传的文件 (字段名: file)')
    }
    let metadata: sharp.Metadata
    try {
      metadata = await sharp(req.file.buffer, {
        animated: req.file.mimetype === 'image/gif',
        limitInputPixels: 40_000_000,
      }).metadata()
    } catch {
      throw new BadRequestError('文件内容不是有效图片')
    }
    const ext = extname(req.file.originalname).toLowerCase()
    if (!mimeMatchesDecodedFormat(req.file.mimetype, metadata.format) || EXT_TO_FORMAT[ext] !== metadata.format) {
      throw new BadRequestError('文件内容不是有效图片')
    }

    const bucket = monthBucket()
    const dir = join(env.UPLOAD_ROOT, bucket)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const filename = `${nanoid(14)}${ext}`
    await writeFile(join(dir, filename), req.file.buffer)
    const url = `/uploads/${bucket}/${filename}`

    res.status(201).json({
      data: {
        url,
        filename,
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
