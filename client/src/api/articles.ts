import { http } from './http'
import type { Article, ArticleStatus, PagedResult } from '@/types/api'

export interface ListArticlesParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  tag?: string
  status?: ArticleStatus
  authorId?: number
}

export interface ArticleInput {
  title: string
  summary?: string
  content: string
  coverUrl?: string
  categoryId: number
  tags: string[]
  status?: ArticleStatus
}

export type ArticleUpdateInput = Partial<ArticleInput>

/** Article shape returned by `/users/me/favorites` (adds favoritedAt) */
export interface FavoritedArticle extends Article {
  favoritedAt: string
}

export async function listArticles(params: ListArticlesParams = {}): Promise<PagedResult<Article>> {
  const { data } = await http.get<{ data: PagedResult<Article> }>('/articles', { params })
  return data.data
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  const { data } = await http.get<{ data: Article }>(`/articles/${encodeURIComponent(slug)}`)
  return data.data
}

export async function getArticleById(id: number): Promise<Article> {
  const { data } = await http.get<{ data: Article }>(`/articles/by-id/${id}`)
  return data.data
}

export async function createArticle(input: ArticleInput): Promise<Article> {
  const { data } = await http.post<{ data: Article }>('/articles', input)
  return data.data
}

export async function updateArticle(id: number, input: ArticleUpdateInput): Promise<Article> {
  const { data } = await http.put<{ data: Article }>(`/articles/${id}`, input)
  return data.data
}

export async function deleteArticle(id: number): Promise<void> {
  await http.delete(`/articles/${id}`)
}

export async function publishArticle(id: number): Promise<Article> {
  const { data } = await http.post<{ data: Article }>(`/articles/${id}/publish`)
  return data.data
}

export async function listMyFavorites(
  params: { page?: number; pageSize?: number } = {},
): Promise<PagedResult<FavoritedArticle>> {
  const { data } = await http.get<{ data: PagedResult<FavoritedArticle> }>(
    '/users/me/favorites',
    { params },
  )
  return data.data
}

/**
 * Download an article as a Markdown file (with YAML frontmatter). Triggers a
 * native browser save via an off-screen anchor — the Promise resolves once the
 * click has been dispatched, which is enough for the UI to drop its spinner.
 */
export async function downloadArticleMarkdown(slug: string): Promise<void> {
  const resp = await http.get<Blob>(`/articles/${encodeURIComponent(slug)}/export`, {
    responseType: 'blob',
  })
  const cd = (resp.headers['content-disposition'] as string | undefined) ?? ''
  const match = /filename="([^"]+)"/.exec(cd)
  const filename = match ? match[1] : `${slug}.md`

  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the browser a tick before revoking so Safari has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
