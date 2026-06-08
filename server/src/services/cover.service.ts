import { existsSync, mkdirSync } from 'node:fs'
import { writeFile, unlink } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import sharp from 'sharp'
import { env } from '../config/env.js'
import { BadRequestError } from '../utils/errors.js'
import { prisma } from '../lib/prisma.js'
import { nanoid } from '../utils/nanoid.js'
import { getRandomUnsplashPhoto } from './unsplash.service.js'

const COVER_WIDTH = 1600
const COVER_HEIGHT = 900
const COVER_JPEG_QUALITY = 82
const DOWNLOAD_TIMEOUT_MS = 10_000
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024 // 12 MB

// Only allow images coming from picsum / unsplash CDN domains.
// Keep this tight so the cover-from-random endpoint can't be coerced into
// fetching arbitrary URLs (SSRF).
const DOWNLOAD_HOST_ALLOWLIST = new Set([
  'picsum.photos',
  'fastly.picsum.photos',
  'i.picsum.photos',
  'images.unsplash.com',
])

function monthBucket(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface ProcessedCover {
  url: string
  filename: string
  size: number
  mimeType: 'image/jpeg'
}

/**
 * Auto-orient via EXIF, crop to 16:9 with entropy-based attention, encode as
 * JPEG, write to UPLOAD_ROOT/<yyyymm>/<id>.jpg. Returns the public URL.
 */
export async function processCoverBuffer(input: Buffer): Promise<ProcessedCover> {
  const jpeg = await sharp(input)
    .rotate()
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: COVER_JPEG_QUALITY, mozjpeg: true })
    .toBuffer()

  const bucket = monthBucket()
  const dir = join(env.UPLOAD_ROOT, bucket)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const filename = `${nanoid(14)}.jpg`
  const absPath = join(dir, filename)
  await writeFile(absPath, jpeg)

  return {
    url: `/uploads/${bucket}/${filename}`,
    filename,
    size: jpeg.byteLength,
    mimeType: 'image/jpeg',
  }
}

export type CoverSource = 'picsum' | 'unsplash'

interface PickedCover {
  url: string
  /** Only set for Unsplash — ping this after using the photo (Unsplash terms). */
  downloadLocation?: string
}

/** Build a random picsum URL with a fresh seed per call. */
function pickPicsum(): PickedCover {
  return {
    url: `https://picsum.photos/seed/${nanoid(10)}/${COVER_WIDTH}/${COVER_HEIGHT}`,
  }
}

async function pickUnsplash(query?: string): Promise<PickedCover> {
  const photo = await getRandomUnsplashPhoto(query)
  return { url: photo.urls.regular, downloadLocation: photo.links.downloadLocation }
}

export async function pickRandomCoverUrl(
  source: CoverSource,
  query?: string,
): Promise<PickedCover> {
  if (source === 'picsum') return pickPicsum()
  if (source === 'unsplash') return pickUnsplash(query)
  throw new BadRequestError(`未知图源: ${source}`)
}

/**
 * Download a remote image to a Buffer. Domain-allowlisted to defang SSRF;
 * fails fast on oversized payloads.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new BadRequestError('无效的图片地址')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequestError('仅支持 http(s) 图片地址')
  }
  if (!DOWNLOAD_HOST_ALLOWLIST.has(parsed.hostname)) {
    throw new BadRequestError(`域名不在白名单: ${parsed.hostname}`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(parsed.toString(), { signal: controller.signal, redirect: 'follow' })
  } catch (err) {
    throw new BadRequestError(`下载图片失败: ${(err as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    throw new BadRequestError(`下载图片失败: HTTP ${res.status}`)
  }

  const len = Number(res.headers.get('content-length') ?? '0')
  if (len && len > MAX_DOWNLOAD_BYTES) {
    throw new BadRequestError(`图片过大 (>${MAX_DOWNLOAD_BYTES / 1024 / 1024}MB)`)
  }

  const ab = await res.arrayBuffer()
  if (ab.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new BadRequestError(`图片过大 (>${MAX_DOWNLOAD_BYTES / 1024 / 1024}MB)`)
  }
  return Buffer.from(ab)
}

/**
 * Fire-and-forget GET to Unsplash's download_location URL. Per their API
 * guidelines you must "trigger a download" whenever a photo is used. Failures
 * are swallowed — this is best-effort attribution, not part of the user flow.
 */
export function pingUnsplashDownload(downloadLocation: string): void {
  const key = env.UNSPLASH_ACCESS_KEY
  if (!key || !downloadLocation) return
  let parsed: URL
  try {
    parsed = new URL(downloadLocation)
  } catch {
    return
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.unsplash.com') return

  void fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${key}` },
  }).catch(() => {
    /* best-effort */
  })
}

export type CoverDeleteReason = 'not-local' | 'invalid-path' | 'referenced' | 'deleted'

/**
 * Try to remove a cover file from /uploads/. Refuses if:
 *  - URL isn't a /uploads/ path (external link, nothing to delete)
 *  - Path resolves outside UPLOAD_ROOT (defense-in-depth against `..`)
 *  - The file is still referenced by `article.coverUrl` on some article
 *
 * Missing files (ENOENT) are treated as success — the goal is "make it gone".
 * Used by:
 *  - The dropzone DELETE endpoint (user removed / re-rolled)
 *  - Article update / delete hooks (old cover no longer referenced)
 */
export async function tryDeleteCoverFile(
  url: string | null | undefined,
): Promise<{ deleted: boolean; reason: CoverDeleteReason }> {
  if (!url || !url.startsWith('/uploads/')) {
    return { deleted: false, reason: 'not-local' }
  }

  const uploadsRoot = resolve(env.UPLOAD_ROOT)
  const relPath = url.replace(/^\/uploads\//, '')
  const absPath = resolve(uploadsRoot, relPath)
  if (absPath !== uploadsRoot && !absPath.startsWith(uploadsRoot + sep)) {
    return { deleted: false, reason: 'invalid-path' }
  }

  const referenced = await prisma.article.findFirst({
    where: { coverUrl: url },
    select: { id: true },
  })
  if (referenced) return { deleted: false, reason: 'referenced' }

  try {
    await unlink(absPath)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw err
  }
  return { deleted: true, reason: 'deleted' }
}

/** Same as `tryDeleteCoverFile` but swallows all errors — for fire-and-forget
 *  callers like article update/delete hooks that must not fail their main op. */
export async function tryDeleteCoverFileSafe(url: string | null | undefined): Promise<void> {
  try {
    await tryDeleteCoverFile(url)
  } catch {
    /* best-effort cleanup */
  }
}
