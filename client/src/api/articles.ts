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
