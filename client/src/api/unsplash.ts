import { http } from './http'

export interface UnsplashPhoto {
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
  results: UnsplashPhoto[]
}

export async function searchUnsplashPhotos(
  query: string,
  page = 1,
  perPage = 12,
): Promise<UnsplashSearchResult> {
  const { data } = await http.get<{ data: UnsplashSearchResult }>('/unsplash/search', {
    params: { query, page, perPage },
    timeout: 15_000,
  })
  return data.data
}

export async function getRandomUnsplashPhoto(query?: string): Promise<UnsplashPhoto> {
  const { data } = await http.get<{ data: UnsplashPhoto }>('/unsplash/random', {
    params: { query },
    timeout: 15_000,
  })
  return data.data
}

