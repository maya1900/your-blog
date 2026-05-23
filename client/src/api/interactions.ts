import { http } from './http'

export interface LikeToggle {
  liked: boolean
  likeCount: number
}

export interface FavoriteToggle {
  favorited: boolean
  favoriteCount: number
}

export async function toggleLike(articleId: number): Promise<LikeToggle> {
  const { data } = await http.post<{ data: LikeToggle }>(`/articles/${articleId}/like`)
  return data.data
}

export async function toggleFavorite(articleId: number): Promise<FavoriteToggle> {
  const { data } = await http.post<{ data: FavoriteToggle }>(`/articles/${articleId}/favorite`)
  return data.data
}
