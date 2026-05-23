import { http } from './http'

export interface UploadedImage {
  url: string
  filename: string
  size: number
  mimeType: string
}

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024
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
