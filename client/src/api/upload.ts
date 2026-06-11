import { http } from './http'

export interface UploadedImage {
  url: string
  filename: string
  size: number
  mimeType: string
}

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024
const COVER_MAX_BYTES = 8 * 1024 * 1024
export const UPLOAD_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

/**
 * POST /api/upload/image. Server enforces type + size; we also do a local
 * check so we can fail fast and surface a friendlier message.
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`不支持的文件类型: ${file.type || file.name}`)
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error(`文件超出 ${UPLOAD_MAX_BYTES / 1024 / 1024}MB 上限`)
  }
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await http.post<{ data: UploadedImage }>('/upload/image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  })
  return data.data
}

/**
 * POST /api/upload/cover. Server compresses to JPEG, crops to 16:9 — accepts a
 * slightly bigger raw file than `/upload/image` since the output is shrunk.
 */
export async function uploadCover(file: File): Promise<UploadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`不支持的文件类型: ${file.type || file.name}`)
  }
  if (file.size > COVER_MAX_BYTES) {
    throw new Error(`文件超出 ${COVER_MAX_BYTES / 1024 / 1024}MB 上限`)
  }
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await http.post<{ data: UploadedImage }>('/upload/cover', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  })
  return data.data
}

export type CoverSource = 'picsum' | 'unsplash'

export interface RandomCoverResult extends UploadedImage {
  source: CoverSource
}

/** POST /api/upload/cover/random. Server picks → downloads → compresses → saves. */
export async function uploadRandomCover(source: CoverSource): Promise<RandomCoverResult> {
  const { data } = await http.post<{ data: RandomCoverResult }>(
    '/upload/cover/random',
    { source },
    { timeout: 30_000 },
  )
  return data.data
}

/**
 * Best-effort: delete a previously-saved cover file from /uploads/. Server
 * refuses if the file is still referenced by an article, so this is safe to
 * call eagerly when re-rolling random picks.
 */
export async function deleteCoverFile(url: string): Promise<void> {
  if (!url.startsWith('/uploads/')) return
  try {
    await http.delete('/upload/cover', { data: { url } })
  } catch {
    // Swallow — cleanup failures shouldn't surface to the user.
  }
}

/**
 * Variant of `deleteCoverFile` for page-unload / `pagehide` cleanup. Uses raw
 * `fetch` with `keepalive: true` so the request survives the page tear-down
 * (axios doesn't expose `keepalive`). Best-effort — never rejects.
 */
export function deleteCoverFileKeepalive(url: string, token: string | null): void {
  if (!url.startsWith('/uploads/')) return
  if (!token) return
  try {
    void fetch('/api/upload/cover', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    })
  } catch {
    /* best-effort */
  }
}
