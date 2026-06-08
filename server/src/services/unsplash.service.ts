import { env } from '../config/env.js'
import { BadRequestError } from '../utils/errors.js'

const UNSPLASH_API_BASE = 'https://api.unsplash.com'
const UNSPLASH_TIMEOUT_MS = 8_000

export interface UnsplashPhoto {
  id: string
  width: number
  height: number
  color: string | null
  blur_hash?: string | null
  description?: string | null
  alt_description?: string | null
  urls: {
    small: string
    regular: string
    full?: string
  }
  links: {
    html: string
    download_location: string
  }
  user: {
    name: string
    username: string
    links: {
      html: string
    }
  }
}

interface UnsplashSearchResponse {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}

export interface NormalizedUnsplashPhoto {
  id: string
  width: number
  height: number
  color: string | null
  alt: string
  urls: {
    small: string
    regular: string
  }
  links: {
    html: string
    downloadLocation: string
  }
  photographer: {
    name: string
    username: string
    url: string
  }
}

export interface UnsplashSearchResult {
  total: number
  totalPages: number
  results: NormalizedUnsplashPhoto[]
}

function requireUnsplashKey(): string {
  const key = env.UNSPLASH_ACCESS_KEY
  if (!key) {
    throw new BadRequestError('未配置 Unsplash (请在 .env 设置 UNSPLASH_ACCESS_KEY)')
  }
  return key
}

function normalizePhoto(photo: UnsplashPhoto): NormalizedUnsplashPhoto {
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    color: photo.color,
    alt: photo.alt_description ?? photo.description ?? 'Unsplash photo',
    urls: {
      small: photo.urls.small,
      regular: photo.urls.regular,
    },
    links: {
      html: photo.links.html,
      downloadLocation: photo.links.download_location,
    },
    photographer: {
      name: photo.user.name,
      username: photo.user.username,
      url: photo.user.links.html,
    },
  }
}

async function unsplashFetch<T>(path: string, params: URLSearchParams): Promise<T> {
  const key = requireUnsplashKey()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UNSPLASH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${UNSPLASH_API_BASE}${path}?${params.toString()}`, {
      headers: {
        Authorization: `Client-ID ${key}`,
        'Accept-Version': 'v1',
      },
      signal: controller.signal,
    })
  } catch (err) {
    throw new BadRequestError(`Unsplash 请求失败: ${(err as Error).message}`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new BadRequestError(`Unsplash 返回 ${res.status}`)
  }
  return (await res.json()) as T
}

export async function searchUnsplashPhotos(input: {
  query: string
  page: number
  perPage: number
}): Promise<UnsplashSearchResult> {
  const params = new URLSearchParams({
    query: input.query,
    page: String(input.page),
    per_page: String(input.perPage),
    orientation: 'landscape',
    content_filter: 'high',
  })
  const data = await unsplashFetch<UnsplashSearchResponse>('/search/photos', params)
  return {
    total: data.total,
    totalPages: data.total_pages,
    results: data.results.map(normalizePhoto),
  }
}

export async function getRandomUnsplashPhoto(
  query?: string,
): Promise<NormalizedUnsplashPhoto> {
  const params = new URLSearchParams({
    orientation: 'landscape',
    content_filter: 'high',
  })
  if (query && query.trim()) params.set('query', query.trim().slice(0, 60))
  const data = await unsplashFetch<UnsplashPhoto>('/photos/random', params)
  return normalizePhoto(data)
}

